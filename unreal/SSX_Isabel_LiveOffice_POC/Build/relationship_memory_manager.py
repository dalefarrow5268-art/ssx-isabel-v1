"""Relationship/work-continuity memory manager for Isabel POC.

This is provider/storage agnostic. It defines the behaviors the runtime must preserve
once a real persistence store is connected.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Iterable, Optional


@dataclass
class MemoryEntry:
    id: str
    memory_class: str
    subject: str
    statement: str
    project_id: Optional[str] = None
    confidence: float = 1.0
    source: str = "conversation"
    created_at: str = ""
    last_confirmed_at: Optional[str] = None
    expires_at: Optional[str] = None
    status: str = "proposed"
    sensitivity: str = "normal"
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()
        self.confidence = max(0.0, min(1.0, self.confidence))


class RelationshipMemoryManager:
    """Small deterministic layer between Isabel's brain and durable storage."""

    def __init__(self, entries: Iterable[MemoryEntry] = ()) -> None:
        self.entries = list(entries)

    def propose(self, entry: MemoryEntry) -> MemoryEntry:
        # Inferred durable preferences remain proposals until confirmed.
        if entry.memory_class in {"project", "relationship"} and entry.source not in {
            "user_confirmation",
            "system_event",
        }:
            entry.status = "proposed"
        self.entries.append(entry)
        return entry

    def approve(self, entry_id: str) -> MemoryEntry:
        entry = self._get(entry_id)
        entry.status = "approved"
        entry.last_confirmed_at = datetime.now(timezone.utc).isoformat()
        return entry

    def decline(self, entry_id: str) -> MemoryEntry:
        entry = self._get(entry_id)
        entry.status = "declined"
        return entry

    def resolve_commitment(self, entry_id: str) -> MemoryEntry:
        entry = self._get(entry_id)
        if entry.memory_class != "commitment":
            raise ValueError("Only commitment memory can be resolved")
        entry.status = "resolved"
        return entry

    def retrieve_for_return(self, project_id: Optional[str] = None) -> dict:
        now = datetime.now(timezone.utc)
        relevant: list[MemoryEntry] = []
        commitments: list[MemoryEntry] = []

        for entry in self.entries:
            if entry.status in {"declined", "resolved", "expired"}:
                continue
            if entry.expires_at:
                expiry = datetime.fromisoformat(entry.expires_at.replace("Z", "+00:00"))
                if expiry <= now:
                    entry.status = "expired"
                    continue
            if project_id and entry.project_id not in {None, project_id}:
                continue
            if entry.memory_class == "commitment":
                commitments.append(entry)
            elif entry.status == "approved" or entry.memory_class == "session":
                relevant.append(entry)

        # Project-specific context should be considered before generic relationship context.
        relevant.sort(
            key=lambda e: (
                0 if project_id and e.project_id == project_id else 1,
                0 if e.memory_class == "project" else 1,
                -e.confidence,
            )
        )

        return {
            "context": [asdict(e) for e in relevant],
            "open_commitments": [asdict(e) for e in commitments],
            "rules": {
                "mention_only_when_relevant": True,
                "explicit_current_instruction_wins": True,
                "low_confidence_inference_is_not_fact": True,
            },
        }

    def correct(self, entry_id: str, replacement: MemoryEntry) -> MemoryEntry:
        old = self._get(entry_id)
        old.status = "expired"
        replacement.source = "user_confirmation"
        replacement.status = "approved"
        replacement.last_confirmed_at = datetime.now(timezone.utc).isoformat()
        self.entries.append(replacement)
        return replacement

    def _get(self, entry_id: str) -> MemoryEntry:
        for entry in self.entries:
            if entry.id == entry_id:
                return entry
        raise KeyError(entry_id)


def build_return_brief(manager: RelationshipMemoryManager, project_id: Optional[str]) -> dict:
    """Return a compact brief the session orchestrator can use on user arrival."""
    retrieved = manager.retrieve_for_return(project_id)
    return {
        "resume_context": retrieved["context"][:8],
        "open_commitments": retrieved["open_commitments"][:8],
        "behavior": {
            "do_not_recite_memory": True,
            "surface_unresolved_work_if_relevant": True,
            "keep_welcome_natural": True,
        },
    }
