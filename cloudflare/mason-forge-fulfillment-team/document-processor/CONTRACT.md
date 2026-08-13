# SSX Document Processor Contract

Dexter extracts small plain-text records directly. Binary construction documents are sent through the private Cloudflare service binding `DOCUMENT_PROCESSOR`.

## Request

- Method: `POST`
- Internal path: `/extract`
- Body: original document bytes
- Headers:
  - `content-type`
  - `x-ssx-document-id`
  - `x-ssx-file-name`
  - `x-ssx-document-type`

## Required response

```json
{
  "text": "complete extracted text",
  "pageCount": 120,
  "sheetCount": 120,
  "locators": [
    { "locator": "sheet A101", "start": 0, "end": 8500 }
  ],
  "metadata": {
    "title": "Architectural Floor Plans",
    "revision": "3"
  },
  "warnings": [],
  "passwordProtected": false
}
```

The processor must support PDF, DWG/DXF conversion, DOCX, XLSX, MSG/EML, raster OCR and ZIP inspection. It must never overwrite the source object.
