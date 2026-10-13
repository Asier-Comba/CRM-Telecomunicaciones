"""Generate only synthetic PDFs for the opt-in physical extraction probe."""
import pathlib
import sys
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject

destination = pathlib.Path(sys.argv[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)


def pdf(name, texts, encrypted=False):
    writer = PdfWriter()
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"),
                             NameObject("/BaseFont"): NameObject("/Helvetica")})
    font_ref = writer._add_object(font)
    for text in texts:
        page = writer.add_blank_page(width=595, height=842)
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_ref})})
        stream = DecodedStreamObject()
        literal = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream.set_data(("BT /F1 10 Tf 40 780 Td (" + literal + ") Tj ET").encode("ascii"))
        page[NameObject("/Contents")] = writer._add_object(stream)
    if encrypted:
        writer.encrypt("synthetic-test-password")
    writer.write(destination / name)


pdf("reviewed.pdf", ["Contrato telecom sintetico. Fibra 600 Mbps.", "Permanencia 12 meses. Datos documentales de prueba."])
pdf("long.pdf", ["Fibra de datos autorizados. " * 250])
pdf("encrypted.pdf", ["Contenido sintetico cerrado."], encrypted=True)
pdf("too-many-pages.pdf", ["Pagina sintetica."] * 101)
pdf("too-much-text.pdf", ["Texto sintetico. " * 13_000])
(destination / "malformed.pdf").write_bytes(b"%PDF-1.7\ninvalid synthetic fixture")
