"""Private opt-in PDF text worker. Bytes in, closed page/text JSON out.
No file/URL argument, model call, rendering, metadata or exception publication.
"""
import io
import json
import logging
import sys

logging.disable(logging.CRITICAL)


def main():
    try:
        import pypdf
        from pypdf import filters

        if pypdf.__version__ != "6.10.0":
            return 2
        # Keep parser stream limits finite, below the library defaults. Parent
        # also caps input/output and wall time; this is not an OS sandbox claim.
        for name in ("ZLIB_MAX_OUTPUT_LENGTH", "LZW_MAX_OUTPUT_LENGTH", "RUN_LENGTH_MAX_OUTPUT_LENGTH",
                     "MAX_ARRAY_BASED_STREAM_OUTPUT_LENGTH", "MAX_DECLARED_STREAM_LENGTH", "JBIG2_MAX_OUTPUT_LENGTH"):
            setattr(filters, name, 8_388_608)
        filters.ZLIB_MAX_RECOVERY_INPUT_LENGTH = 65_536
        data = sys.stdin.buffer.read(10_485_761)
        if not data or len(data) > 10_485_760 or not data.startswith(b"%PDF-"):
            return 2
        reader = pypdf.PdfReader(io.BytesIO(data), strict=True, root_object_recovery_limit=1000)
        if reader.is_encrypted or not 1 <= len(reader.pages) <= 100:
            return 2
        pages = []
        total = 0
        for number, page in enumerate(reader.pages, 1):
            text = page.extract_text(extraction_mode="plain")
            if not isinstance(text, str):
                return 2
            total += len(text.encode("utf-8"))
            if total > 200_000:
                return 2
            pages.append({"page": number, "text": text})
        output = json.dumps(pages, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(output) > 220_000:
            return 2
        sys.stdout.buffer.write(output)
        return 0
    except Exception:
        # Never print parser warnings, URLs, source bytes, passwords or tracebacks.
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
