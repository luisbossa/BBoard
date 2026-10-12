const productService = require("../services/productService");
const blobService = require("../services/blobService");
const campaignService = require("../services/campaignService");

const formOptions = async () => ({
  types: productService.TYPES,
  sizes: productService.SIZES,
  collections: await productService.listCollections(),
});

const EMPTY = {
  id: null,
  slug: "",
  name: "",
  product_type: "bikini",
  price: "",
  old_price: "",
  discount: 0,
  description: "",
  description2: "",
  stock: null,
  active: true,
  images: [],
  sizes: ["XS", "S", "M", "L"],
  styles: [
    { label: "REGULAR", image: "/images/regular.png" },
    { label: "HILO", image: "/images/thong.png" },
  ],
  collectionIds: [],
};

// Sube a Blob las imágenes nuevas del formulario.
const uploadImages = (req, folder) =>
  Promise.all((req.files || []).map((file) => blobService.upload(file, folder)));

exports.index = async (req, res) => {
  const filters = {
    q: req.query.q || "",
    type: req.query.type || "",
    status: req.query.status || "",
    page: req.query.page,
  };
  const [{ products, pagination }, campaign] = await Promise.all([
    productService.list(filters),
    campaignService.currentOrNext(),
  ]);
  res.render("products/index", {
    title: "Productos",
    products,
    pagination,
    filters,
    types: productService.TYPES,
    campaign,
  });
};

exports.new = async (req, res) => {
  res.render("products/form", { title: "Nuevo producto", product: EMPTY, ...(await formOptions()) });
};

exports.edit = async (req, res) => {
  const product = await productService.getById(req.params.id);
  res.render("products/form", { title: product.name, product, ...(await formOptions()) });
};

exports.save = async (req, res) => {
  const folder = `products/${productService.slugify(req.body.slug || req.body.name) || "nuevo"}`;
  const uploaded = await uploadImages(req, folder);
  const id = await productService.save(req.params.id, req.body, uploaded, req.user);

  res.flash("success", req.params.id ? "Producto actualizado" : "Producto creado");
  res.redirect(`/dashboard/products/${id}/edit`);
};

exports.toggle = async (req, res) => {
  const active = req.body.active === "1";
  await productService.setActive(req.params.id, active, req.user);
  res.flash("success", active ? "Producto activado" : "Producto desactivado");
  res.redirect(req.get("referer") || "/dashboard/products");
};

exports.destroy = async (req, res) => {
  const { deleted } = await productService.remove(req.params.id, req.user);
  res.flash(
    "success",
    deleted ? "Producto eliminado" : "El producto tiene ventas: se desactivó en lugar de eliminarse",
  );
  res.redirect("/dashboard/products");
};
