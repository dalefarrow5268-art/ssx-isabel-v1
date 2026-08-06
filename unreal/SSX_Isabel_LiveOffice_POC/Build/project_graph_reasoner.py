from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class Node:
    id: str
    type: str
    label: str = ""
    data: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Edge:
    source: str
    target: str
    type: str
    confidence: float = 1.0
    evidence_ids: Tuple[str, ...] = ()


@dataclass
class ImpactPath:
    nodes: List[str]
    edges: List[str]
    confidence: float
    impact_dimension: Optional[str] = None
    status: str = "derived"


class ProjectGraph:
    """Small deterministic causal graph for Isabel's project reasoning layer.

    This is intentionally renderer- and LLM-agnostic. The brain may propose
    candidate relationships, but only this layer promotes them according to
    explicit evidence/confidence rules.
    """

    def __init__(self) -> None:
        self.nodes: Dict[str, Node] = {}
        self.outgoing: Dict[str, List[Edge]] = {}

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node
        self.outgoing.setdefault(node.id, [])

    def add_edge(self, edge: Edge) -> None:
        if edge.source not in self.nodes or edge.target not in self.nodes:
            raise KeyError(f"Unknown endpoint in edge {edge.source} -> {edge.target}")
        if not 0.0 <= edge.confidence <= 1.0:
            raise ValueError("edge confidence must be between 0 and 1")
        self.outgoing.setdefault(edge.source, []).append(edge)

    def find_paths(self, start: str, goal: str, max_depth: int = 8) -> List[ImpactPath]:
        results: List[ImpactPath] = []

        def walk(current: str, seen: List[str], edge_types: List[str], confidence: float) -> None:
            if len(edge_types) > max_depth:
                return
            if current == goal and edge_types:
                results.append(ImpactPath(nodes=list(seen), edges=list(edge_types), confidence=confidence))
                return
            for edge in self.outgoing.get(current, []):
                if edge.target in seen:
                    continue
                walk(
                    edge.target,
                    seen + [edge.target],
                    edge_types + [edge.type],
                    min(confidence, edge.confidence),
                )

        if start in self.nodes and goal in self.nodes:
            walk(start, [start], [], 1.0)
        return sorted(results, key=lambda p: p.confidence, reverse=True)

    @staticmethod
    def classify_relationship(edge_type: str, confidence: float) -> str:
        if edge_type == "MAY_AFFECT":
            return "possible" if confidence < 0.70 else "probable"
        if confidence >= 0.90:
            return "confirmed"
        if confidence >= 0.70:
            return "probable"
        if confidence >= 0.45:
            return "possible"
        return "speculative"

    def consequence_summary(self, start: str, goal: str) -> dict:
        paths = self.find_paths(start, goal)
        if not paths:
            return {
                "status": "unknown",
                "confidence": 0.0,
                "message": "No supported causal path found.",
                "paths": [],
            }

        best = paths[0]
        contains_may_affect = "MAY_AFFECT" in best.edges
        status = self.classify_relationship("MAY_AFFECT" if contains_may_affect else "AFFECTS", best.confidence)

        if status == "speculative":
            message = "Possible relationship only; gather more evidence before presenting as a likely consequence."
        elif status == "possible":
            message = "There is a plausible project consequence, but it is not yet confirmed."
        elif status == "probable":
            message = "Evidence supports a probable project consequence; verify the remaining dependency before treating it as confirmed."
        else:
            message = "Evidence supports this project consequence as confirmed."

        return {
            "status": status,
            "confidence": round(best.confidence, 3),
            "message": message,
            "path": best.nodes,
            "relationships": best.edges,
            "all_paths": [
                {"nodes": p.nodes, "edges": p.edges, "confidence": round(p.confidence, 3)} for p in paths
            ],
        }


def storefront_demo() -> dict:
    graph = ProjectGraph()
    for node in [
        Node("RFI-117", "rfi", "Storefront anchorage clarification"),
        Node("DETAIL-L2-STOREFRONT", "drawing", "Level 2 storefront detail"),
        Node("FAB-RELEASE-STOREFRONT", "milestone", "Storefront fabrication release"),
        Node("INSTALL-STOREFRONT", "activity", "Storefront installation"),
        Node("OWNER-NOTICE", "decision", "Owner schedule-impact notice"),
    ]:
        graph.add_node(node)

    graph.add_edge(Edge("RFI-117", "DETAIL-L2-STOREFRONT", "CLARIFIES", 1.0, ("RFI-117",)))
    graph.add_edge(Edge("DETAIL-L2-STOREFRONT", "FAB-RELEASE-STOREFRONT", "MAY_AFFECT", 0.72, ("RFI-117",)))
    graph.add_edge(Edge("FAB-RELEASE-STOREFRONT", "INSTALL-STOREFRONT", "PRECEDES", 1.0, ("SCHEDULE-44",)))
    graph.add_edge(Edge("INSTALL-STOREFRONT", "OWNER-NOTICE", "REQUIRES_DECISION", 0.86, ("MEETING-MINUTES-21",)))

    result = graph.consequence_summary("RFI-117", "OWNER-NOTICE")
    result["required_unknown"] = "Does the revised anchorage detail change fabrication release status?"
    result["safe_language"] = "There is schedule exposure, but a delay is not confirmed until fabrication release impact is verified."
    return result


if __name__ == "__main__":
    import json

    print(json.dumps(storefront_demo(), indent=2))
