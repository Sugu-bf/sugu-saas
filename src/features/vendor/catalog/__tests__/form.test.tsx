import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseProductDetail } from "../contract";
import {
  EMPTY_FORM,
  buildProductBody,
  combinationKey,
  formFromProduct,
  generateVariants,
  validateForm,
  variantErrors,
  withAxes,
  type PhotoDraft,
  type ProductForm,
} from "../form/model";
import { DESCRIPTION_IMAGE_MAX_BYTES, DescriptionImageError, altFromFilename, prepareDescriptionImage } from "../form/description-image";
import { RichText, renderRichText } from "../form/rich-text";
import { linkAddress, withoutForeignPictures } from "../form/rich-text-editor";
import { productDetail, productRow } from "./fixtures";

const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function photo(overrides: Partial<PhotoDraft> = {}): PhotoDraft {
  return { key: "p1", mediaId: null, file: file("a.jpg"), url: "blob:a", originalUrl: null, isMain: true, removed: false, detour: "idle", previewId: null, detourError: null, ...overrides };
}

/** A form moderation would accept. */
function ready(overrides: Partial<ProductForm> = {}): ProductForm {
  return { ...EMPTY_FORM, name: "Pagne tissé", categoryIds: ["c1"], descriptionHtml: "<p>Tissé main.</p>", price: "7500", stock: "12", photos: [photo()], ...overrides };
}

const entries = (body: FormData, name: string) => body.getAll(name).map((value) => (value instanceof File ? `file:${value.name}` : value));

describe("validation", () => {
  it("stores a draft with a name only", () => {
    expect(validateForm({ ...EMPTY_FORM, name: "Pagne" }, "draft")).toEqual({});
    expect(validateForm(EMPTY_FORM, "draft")).toEqual({ name: "Donnez un nom au produit." });
  });

  it("asks at submission for what moderation needs", () => {
    expect(validateForm(ready(), "submit")).toEqual({});
    expect(Object.keys(validateForm({ ...EMPTY_FORM, name: "Pa" }, "submit")).sort()).toEqual(["categoryIds", "descriptionHtml", "name", "photos", "price"]);
  });

  it("does not count empty markup as a description, nor a removed picture as a picture", () => {
    expect(validateForm(ready({ descriptionHtml: "<p>&nbsp;</p><p></p>" }), "submit")).toHaveProperty("descriptionHtml");
    expect(validateForm(ready({ photos: [photo({ mediaId: "11", file: null, removed: true })] }), "submit")).toHaveProperty("photos");
  });

  it("waits for a detouring in progress", () => {
    expect(validateForm(ready({ photos: [photo({ detour: "processing" })] }), "draft").photos).toMatch(/détourage est en cours/);
  });

  it.each([
    ["abc", "price"],
    ["7 500", "price"],
    ["-5", "price"],
  ])("refuses the price %j", (price, field) => {
    expect(validateForm(ready({ price }), "draft")).toHaveProperty(field);
  });

  it("accepts a decimal comma and refuses a crossed-out price below the price", () => {
    expect(validateForm(ready({ price: "7500,50" }), "submit")).toEqual({});
    expect(validateForm(ready({ compareAtPrice: "7000" }), "submit")).toHaveProperty("compareAtPrice");
    expect(validateForm(ready({ compareAtPrice: "9000" }), "submit")).toEqual({});
  });

  it("checks the price tiers: quantities unique, price going down", () => {
    const tiers = (list: [string, string][]) => list.map(([minQuantity, price], index) => ({ id: `t${index}`, minQuantity, price }));
    expect(validateForm(ready({ hasTiers: true, tiers: [] }), "draft").tiers).toMatch(/au moins un palier/);
    expect(validateForm(ready({ hasTiers: true, tiers: tiers([["10", "7000"], ["10", "6500"]]) }), "draft").tiers).toMatch(/même quantité/);
    expect(validateForm(ready({ hasTiers: true, tiers: tiers([["10", "7000"], ["20", "7200"]]) }), "draft").tiers).toMatch(/baisser/);
    expect(validateForm(ready({ hasTiers: true, tiers: tiers([["20", "6500"], ["10", "7000"]]) }), "draft")).toEqual({});
    // Switched off: what was typed is not checked.
    expect(validateForm(ready({ hasTiers: false, tiers: tiers([["0", "x"]]) }), "draft")).toEqual({});
  });

  it("keys the errors of a variant by its id, and spots a reference used twice", () => {
    const form = withAxes(ready({ hasVariants: true }), [{ id: "a1", name: "Taille", values: ["M", "L"] }]);
    const [first, second] = form.variants;
    const broken = {
      ...form,
      variants: [
        { ...first, price: "0", stock: "-1", sku: "REF-1" },
        { ...second, sku: "ref-1", minOrderQuantity: "0" },
      ],
    };
    const errors = validateForm(broken, "draft");

    expect(variantErrors(errors, first.id)).toEqual({ price: "Prix supérieur à zéro.", stock: "Entier positif ou nul." });
    expect(variantErrors(errors, second.id)).toMatchObject({ minOrderQuantity: "Entre 1 et 500." });
    expect(variantErrors(errors, second.id).sku).toMatch(/déjà utilisée/);
  });

  it("asks for an option and its values before any variant, and caps their number", () => {
    expect(validateForm(ready({ hasVariants: true }), "draft").axes).toMatch(/Ajoutez une option/);
    expect(validateForm(ready({ hasVariants: true, axes: [{ id: "a", name: "Taille", values: [] }] }), "draft").axes).toMatch(/au moins une valeur/);

    const many = (count: number) => Array.from({ length: count }, (_, index) => `v${index}`);
    const big = withAxes(ready({ hasVariants: true }), [
      { id: "a", name: "A", values: many(11) },
      { id: "b", name: "B", values: many(10) },
    ]);
    expect(big.variants).toHaveLength(110);
    expect(validateForm(big, "draft").axes).toMatch(/100 variantes \(110 ici\)/);
  });
});

describe("variants", () => {
  const base = ready({ hasVariants: true, price: "7500", minOrderQuantity: "2", lowStockThreshold: "5" });

  it("builds every combination of the options, from the product's price and rules", () => {
    const form = withAxes(base, [
      { id: "a", name: "Couleur", values: ["Rouge", "Bleu"] },
      { id: "b", name: "Taille", values: ["M", "L"] },
    ]);
    expect(form.variants.map((variant) => combinationKey(variant.combination))).toEqual([
      "Couleur:Rouge|Taille:M",
      "Couleur:Rouge|Taille:L",
      "Couleur:Bleu|Taille:M",
      "Couleur:Bleu|Taille:L",
    ]);
    expect(form.variants[0]).toMatchObject({ price: "7500", stock: "0", sku: "", minOrderQuantity: "2", lowStockThreshold: "5" });
  });

  it("keeps what was typed when an option gains or loses a value", () => {
    const start = withAxes(base, [{ id: "a", name: "Taille", values: ["M", "L"] }]);
    const edited = { ...start, variants: start.variants.map((variant) => (variant.combination.Taille === "L" ? { ...variant, price: "8000", stock: "3", sku: "L-1" } : variant)) };

    const grown = withAxes(edited, [{ id: "a", name: "Taille", values: ["M", "L", "XL"] }]);
    expect(grown.variants.find((variant) => variant.combination.Taille === "L")).toMatchObject({ price: "8000", stock: "3", sku: "L-1" });
    expect(grown.variants.find((variant) => variant.combination.Taille === "XL")).toMatchObject({ price: "7500", stock: "0" });

    const shrunk = withAxes(grown, [{ id: "a", name: "Taille", values: ["L", "XL"] }]);
    expect(shrunk.variants.map((variant) => variant.combination.Taille)).toEqual(["L", "XL"]);
    expect(shrunk.variants[0]).toMatchObject({ price: "8000", sku: "L-1" });
  });

  it("ignores an option without a value yet, and gives nothing without any option", () => {
    expect(generateVariants({ ...base, axes: [{ id: "a", name: "Taille", values: ["M"] }, { id: "b", name: "Couleur", values: [] }], variants: [] })).toHaveLength(1);
    expect(generateVariants({ ...base, axes: [], variants: [] })).toEqual([]);
  });
});

describe("editing a stored product", () => {
  it("rebuilds options, variants and pictures from what the backend stores", () => {
    const form = formFromProduct(
      parseProductDetail(
        productDetail({
          category_ids: ["c1", "c2"],
          weight: 2000,
          variants: [
            { id: "v1", title: "Rouge / M", sku: "FDF-R-M", price: 7500, stock: 4, isActive: true, isDefault: true, lowStockThreshold: 3, minOrderQuantity: 2, allowBackorder: true, options: { Couleur: "Rouge", Taille: "M" }, bulkPrices: [{ id: "x", minQty: 5, price: 7000, isActive: true }] },
            { id: "v2", title: "Bleu / L", sku: "FDF-B-L", price: 8000, stock: 3, isActive: true, isDefault: false, options: { Couleur: "Bleu", Taille: "L" }, bulkPrices: [] },
          ],
        }),
      ),
    );

    expect(form).toMatchObject({ name: "Pagne tissé Faso Dan Fani", categoryIds: ["c1", "c2"], price: "7500", compareAtPrice: "9000", weight: "2", weightUnit: "kg", hasVariants: true, hasTiers: true });
    expect(form.axes.map((axis) => [axis.name, axis.values])).toEqual([
      ["Couleur", ["Rouge", "Bleu"]],
      ["Taille", ["M", "L"]],
    ]);
    expect(form.variants[0]).toMatchObject({ id: "v1", price: "7500", stock: "4", sku: "FDF-R-M", minOrderQuantity: "2", lowStockThreshold: "3", allowBackorder: true });
    expect(form.variants[0].tiers).toEqual([{ id: "x", minQuantity: "5", price: "7000" }]);
    expect(form.photos.map((picture) => [picture.mediaId, picture.isMain, picture.file])).toEqual([
      ["11", true, null],
      ["12", false, null],
    ]);
    // Opening the form adds no variant: only the stored combinations are listed,
    // even when they are not every combination of the options.
    expect(form.variants.map((variant) => variant.id)).toEqual(["v1", "v2"]);
    // Changing an option regenerates the combinations; the stored ones keep their figures.
    const regenerated = withAxes(form, form.axes).variants;
    expect(regenerated).toHaveLength(4);
    expect(regenerated.filter((variant) => ["v1", "v2"].includes(variant.id))).toEqual(form.variants);
  });

  it("reads a simple product: its stock is the one of its single variant", () => {
    const form = formFromProduct(parseProductDetail(productRow({ stock: 12, weight: 350 })));
    expect(form).toMatchObject({ hasVariants: false, stock: "12", weight: "350", weightUnit: "g", axes: [], variants: [] });
  });
});

describe("request", () => {
  it("creates a draft, whatever the seller then decides: `published` is never sent", () => {
    const body = buildProductBody(ready({ compareAtPrice: "9000", weight: "1,5", weightUnit: "kg", originCountry: "BF" }), "create");

    expect(body.get("status")).toBe("draft");
    expect(body.get("_method")).toBeNull();
    expect(Object.fromEntries(["name", "price", "compareAtPrice", "stock", "weight", "weightUnit", "country_of_origin", "hasVariants", "primary_category_id"].map((key) => [key, body.get(key)]))).toEqual({
      name: "Pagne tissé",
      price: "7500",
      compareAtPrice: "9000",
      stock: "12",
      weight: "1.5",
      weightUnit: "kg",
      country_of_origin: "BF",
      hasVariants: "0",
      primary_category_id: "c1",
    });
    expect(entries(body, "category[]")).toEqual(["c1"]);
    expect([...body.values()]).not.toContain("published");
  });

  it("leaves the status alone on an update, and clears a crossed-out price with an empty value", () => {
    const body = buildProductBody(ready({ compareAtPrice: "" }), "update");
    expect(body.get("_method")).toBe("PUT");
    expect(body.has("status")).toBe(false);
    expect(body.get("compareAtPrice")).toBe("");
  });

  it("sends each variant with its options, figures and tiers, and no product stock", () => {
    const form = withAxes(ready({ hasVariants: true }), [{ id: "a", name: "Taille", values: ["M", "L"] }]);
    form.variants[1] = { ...form.variants[1], price: "8000", stock: "3", sku: " L-1 ", allowBackorder: true, tiers: [{ id: "t", minQuantity: "5", price: "7500" }] };
    const body = buildProductBody(form, "create");

    expect(body.get("hasVariants")).toBe("1");
    expect(body.has("stock")).toBe(false);
    expect(body.get("variants[0][options][Taille]")).toBe("M");
    expect(body.has("variants[0][sku]")).toBe(false);
    expect(Object.fromEntries(["options][Taille", "price", "stock", "sku", "allowBackorder", "bulkPrices][0][minQty", "bulkPrices][0][price"].map((key) => [key, body.get(`variants[1][${key}]`)]))).toEqual({
      "options][Taille": "L",
      price: "8000",
      stock: "3",
      sku: "L-1",
      allowBackorder: "1",
      "bulkPrices][0][minQty": "5",
      "bulkPrices][0][price": "7500",
    });
  });

  it("uploads new pictures to `images` at creation, the cover first", () => {
    const body = buildProductBody(ready({ photos: [photo({ key: "a", file: file("a.jpg"), isMain: false }), photo({ key: "b", file: file("b.jpg"), isMain: true })] }), "create");
    expect(entries(body, "images[]")).toEqual(["file:b.jpg", "file:a.jpg"]);
    expect(body.has("gallery[]")).toBe(false);
  });

  it("adds, removes and promotes pictures by media id on an update, never by URL", () => {
    const body = buildProductBody(
      ready({
        photos: [
          photo({ key: "s1", mediaId: "11", file: null, isMain: false }),
          photo({ key: "s2", mediaId: "12", file: null, isMain: true }),
          photo({ key: "s3", mediaId: "13", file: null, isMain: false, removed: true }),
          photo({ key: "n1", file: file("new.jpg"), isMain: false }),
        ],
      }),
      "update",
    );
    expect(entries(body, "gallery[]")).toEqual(["file:new.jpg"]);
    expect(entries(body, "remove_media_ids[]")).toEqual(["13"]);
    expect(body.get("main_media_id")).toBe("12");
    expect(body.has("images[]")).toBe(false);
    expect(body.has("images")).toBe(false);
  });

  it("sends an accepted detouring by its preview id, and the file only when it was not detoured", () => {
    const body = buildProductBody(
      ready({
        photos: [
          photo({ key: "a", file: file("a.jpg"), isMain: true, detour: "accepted", previewId: "prev-1" }),
          photo({ key: "b", file: file("b.jpg"), isMain: false, detour: "preview", previewId: "prev-2" }),
        ],
      }),
      "create",
    );
    expect(entries(body, "background_removal_preview_ids[]")).toEqual(["prev-1"]);
    expect(body.get("background_removal_main_preview_id")).toBe("prev-1");
    // A preview that was not accepted is not a decision: the original is sent.
    expect(entries(body, "images[]")).toEqual(["file:b.jpg"]);
    expect(body.has("preview_ids[]")).toBe(false);
  });
});

describe("rich description, read", () => {
  const dangerous =
    '<h2 onclick="steal()">Tissage</h2><p style="position:fixed">Fait <strong>main</strong>, <em>teinture</em> <u>naturelle</u>.</p>' +
    '<ul><li>Coton</li></ul><script>window.__xss = true</script><img src="x" onerror="alert(1)">' +
    '<a href="javascript:alert(2)">piège</a> <a href="https://sugu.pro/guide">guide</a><iframe src="https://evil.test"></iframe>';

  it("keeps the formatting and rebuilds nothing that could run or restyle the page", () => {
    const { container } = render(<RichText html={dangerous} />);

    expect(container.querySelector("h2")?.textContent).toBe("Tissage");
    expect(container.querySelector("strong")?.textContent).toBe("main");
    expect(container.querySelectorAll("li")).toHaveLength(1);
    for (const selector of ["script", "iframe", "img", "[onclick]", "[onerror]", "[style]"]) {
      expect(container.querySelector(selector), selector).toBeNull();
    }
    expect(container.innerHTML).not.toContain("__xss");
  });

  it("drops a link that is not http, https or mailto, and opens the others safely", () => {
    const { container } = render(<RichText html={dangerous} />);
    const links = Array.from(container.querySelectorAll("a"));
    expect(links.map((link) => link.textContent)).toEqual(["guide"]);
    expect(links[0]).toHaveAttribute("href", "https://sugu.pro/guide");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer nofollow");
    // The text of the refused link is still readable.
    expect(container.textContent).toContain("piège");
  });

  it("renders nothing for an empty description", () => {
    expect(renderRichText(null)).toEqual([]);
    expect(renderRichText("<p></p><p>&nbsp; </p>")).toEqual([]);
    expect(render(<RichText html="" />).container.innerHTML).toBe("");
  });

  it("shows the pictures of a description: hosted, or inlined by the editor, and no other source", () => {
    const hosted = "https://cdn.sugu.pro/s/products/01/description/detail.webp";
    const inlined = "data:image/png;base64,iVBORw0KGgo=";
    const html =
      `<img src="${hosted}" alt="Détail du tissage" onerror="steal()" class="float" style="position:fixed">` +
      `<img src="${inlined}">` +
      '<img src="javascript:alert(1)"><img src="/relative.png"><img src="data:image/svg+xml;base64,PHN2Zz4="><img src="data:text/html;base64,PGI+">';

    const pictures = Array.from(render(<RichText html={html} />).container.querySelectorAll("img"));
    expect(pictures.map((picture) => picture.getAttribute("src"))).toEqual([hosted, inlined]);
    expect(pictures[0]).toHaveAttribute("alt", "Détail du tissage");
    // A picture without description is announced as decoration, not by its address.
    expect(pictures[1]).toHaveAttribute("alt", "");
    for (const attribute of ["onerror", "class", "style"]) expect(pictures[0]).not.toHaveAttribute(attribute);
  });

  it("counts a description made of a picture only as a description to show", () => {
    expect(renderRichText('<p><img src="https://cdn.sugu.pro/a.webp"></p>')).toHaveLength(1);
  });

  it("rebuilds a table cell by cell, with its merged cells and nothing else it carried", () => {
    const html =
      '<table style="position:fixed" onclick="steal()"><colgroup><col style="min-width:25px"></colgroup><tbody>' +
      '<tr><th colspan="2" rowspan="1" onclick="steal()"><p>Tailles</p></th></tr>' +
      '<tr><td colspan="9999"><p>M</p></td><td><script>steal()</script><p>98 cm</p></td></tr></tbody></table>';

    const { container } = render(<RichText html={html} />);
    const table = container.querySelector("table") as HTMLTableElement;
    // A wide table scrolls in its own box.
    expect(table.parentElement).toHaveClass("overflow-x-auto");
    expect(container.querySelector("th")).toHaveAttribute("colspan", "2");
    expect(container.querySelector("th")).not.toHaveAttribute("rowspan");
    expect(container.querySelector("td")).not.toHaveAttribute("colspan");
    expect(Array.from(container.querySelectorAll("td"), (cell) => cell.textContent)).toEqual(["M", "98 cm"]);
    for (const selector of ["colgroup", "col", "script", "[onclick]", "table[style]"]) {
      expect(container.querySelector(selector), selector).toBeNull();
    }
  });

  it("keeps a colour, a highlight and an alignment only as plain values", () => {
    const html =
      '<p style="text-align: center; position: fixed">Centré</p><p style="text-align: inherit">Hérité</p>' +
      '<p><span style="color: #dc2626; position: absolute">Rouge</span> <span style="font-size: 90px">Gros</span></p>' +
      '<p><mark data-color="#fef08a" style="background-color: #fef08a">Surligné</mark> <mark data-color="url(evil)">Autre</mark></p>';

    const { container } = render(<RichText html={html} />);
    const [centered, inherited] = Array.from(container.querySelectorAll("p"));
    expect(centered.style.textAlign).toBe("center");
    expect(centered.style.position).toBe("");
    expect(inherited).not.toHaveAttribute("style");

    // A span is kept for its colour only; another one is just its text.
    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(1);
    expect(spans[0].style.color).toMatch(/^(#dc2626|rgb\(220, 38, 38\))$/);
    expect(spans[0].style.position).toBe("");
    expect(container.textContent).toContain("Gros");

    const marks = container.querySelectorAll("mark");
    expect(marks[0].style.backgroundColor).toMatch(/^(#fef08a|rgb\(254, 240, 138\))$/);
    expect(marks[1]).not.toHaveAttribute("style");
  });
});

describe("rich description, written", () => {
  it("keeps a pasted picture that travels with the text, and leaves out one hosted elsewhere", () => {
    const pasted = withoutForeignPictures(
      '<p>Notre atelier</p><img src="data:image/jpeg;base64,/9j/4AAQ" alt="Atelier"><img src="https://autre-site.test/photo.jpg"><img src="data:image/svg+xml;base64,PHN2Zz4=">',
    );
    expect(pasted.removed).toBe(2);
    expect(pasted.html).toContain("data:image/jpeg;base64,/9j/4AAQ");
    expect(pasted.html).not.toContain("autre-site.test");
    expect(pasted.html).not.toContain("svg+xml");
    expect(pasted.html).toContain("Notre atelier");
  });

  it("leaves markup without picture exactly as it was pasted", () => {
    const html = "<p>Coton <strong>tissé</strong></p>";
    expect(withoutForeignPictures(html)).toEqual({ html, removed: 0 });
  });

  it("completes the address of a link, and refuses what is not one", () => {
    expect(linkAddress(" sugu.pro/boutique ")).toBe("https://sugu.pro/boutique");
    expect(linkAddress("http://exemple.bf")).toBe("http://exemple.bf/");
    expect(linkAddress("mailto:contact@sugu.pro")).toBe("mailto:contact@sugu.pro");
    for (const refused of ["", "   ", "javascript:alert(1)", "data:text/html,x", "bonjour", "ftp://exemple.bf"]) {
      expect(linkAddress(refused), refused).toBeNull();
    }
  });
});

describe("pictures of a description", () => {
  const picture = (name: string, type: string, size = 8) => new File([new Uint8Array(size)], name, { type });

  it("names a picture after its file, as a starting point", () => {
    expect(altFromFilename("IMG_2024-03.detail-broderie.JPG")).toBe("IMG 2024 03 detail broderie");
    expect(altFromFilename("boubou")).toBe("boubou");
  });

  it("inlines a light picture as it is, for Laravel to store on save", async () => {
    const prepared = await prepareDescriptionImage(picture("detail-du-tissage.png", "image/png"));
    expect(prepared.src).toMatch(/^data:image\/png;base64,/);
    expect(prepared.alt).toBe("detail du tissage");
  });

  it("refuses what Laravel would not store, in a sentence that names the file", async () => {
    await expect(prepareDescriptionImage(picture("schema.svg", "image/svg+xml"))).rejects.toThrow(DescriptionImageError);
    await expect(prepareDescriptionImage(picture("notice.pdf", "application/pdf"))).rejects.toThrow("« notice.pdf » n'est pas une image JPG, PNG, WEBP ou GIF.");
    // An animation is never redrawn: over the limit, it is refused.
    await expect(prepareDescriptionImage(picture("defile.gif", "image/gif", DESCRIPTION_IMAGE_MAX_BYTES + 1))).rejects.toThrow("« defile.gif » dépasse 5 Mo.");
  });
});
