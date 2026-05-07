const { default: mongoose } = require("mongoose");
const Product = require("../../models/productModel");

const ALLOWED_GENDERS = ["men", "women"];
const MEN_CATEGORIES = ["Blazer", "Sherwani", "Shirt", "Pant"];
const WOMEN_CATEGORIES = ["Chaniya-Choli", "Gown", "Overcoat"];
const ALLOWED_MEASUREMENT_TYPES = ["meter", "piece"];

function asNumberOrNull(v) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseMultiParam(raw) {
  if (raw == null) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

const getProducts = async (req, res) => {
  try {
    const organizationId = req.decoded.ordId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sku = req.query.sku;
    const name = req.query.name;
    const skip = (page - 1) * limit;
    const isDeleted = req.query.isDeleted;
    const genderRaw = req.query.gender;
    const categoryRaw = req.query.category;
    const measurementTypeRaw = req.query.measurementType;
    const sizeRaw = req.query.size;
    const minPriceRaw = req.query.minPrice ?? req.query.minPerUnitCost;
    const maxPriceRaw = req.query.maxPrice ?? req.query.maxPerUnitCost;

    const gender =
      genderRaw != null && String(genderRaw).trim() !== ""
        ? String(genderRaw).trim().toLowerCase()
        : null;
    if (gender && !ALLOWED_GENDERS.includes(gender)) {
      return res.status(400).json({
        message: `gender must be one of: ${ALLOWED_GENDERS.join(", ")}.`,
        allowedGenders: ALLOWED_GENDERS,
      });
    }

    const allCategories = [...MEN_CATEGORIES, ...WOMEN_CATEGORIES];
    const categoryValuesRaw = parseMultiParam(categoryRaw);
    const categories = categoryValuesRaw.length
      ? categoryValuesRaw.map((raw) => {
          const match = allCategories.find(
            (c) => c.toLowerCase() === raw.toLowerCase()
          );
          if (!match) {
            return null;
          }
          return match;
        })
      : [];
    if (categoryValuesRaw.length && categories.some((c) => c === null)) {
      return res.status(400).json({
        message: `category must be one of: ${allCategories.join(", ")}.`,
        allowedCategories: allCategories,
      });
    }
    if (gender && categories.length) {
      const allowedCategories = gender === "men" ? MEN_CATEGORIES : WOMEN_CATEGORIES;
      const invalid = categories.find((c) => !allowedCategories.includes(c));
      if (invalid) {
        return res.status(400).json({
          message: `Invalid category '${invalid}' for ${gender}`,
          allowedCategories,
        });
      }
    }

    const measurementType =
      measurementTypeRaw != null && String(measurementTypeRaw).trim() !== ""
        ? String(measurementTypeRaw).trim().toLowerCase()
        : null;
    if (measurementType && !ALLOWED_MEASUREMENT_TYPES.includes(measurementType)) {
      return res.status(400).json({
        message: `measurementType must be one of: ${ALLOWED_MEASUREMENT_TYPES.join(
          ", "
        )}.`,
        allowedMeasurementTypes: ALLOWED_MEASUREMENT_TYPES,
      });
    }

    const sizes = parseMultiParam(sizeRaw).map((s) => s.toUpperCase());

    const minPrice = asNumberOrNull(minPriceRaw);
    const maxPrice = asNumberOrNull(maxPriceRaw);
    if ((minPriceRaw != null && minPrice === null) || (maxPriceRaw != null && maxPrice === null)) {
      return res.status(400).json({ message: "minPrice/maxPrice must be valid numbers." });
    }
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      return res.status(400).json({ message: "minPrice cannot be greater than maxPrice." });
    }

    const perUnitCostFilter =
      minPrice != null || maxPrice != null
        ? {
            ...(minPrice != null ? { $gte: minPrice } : {}),
            ...(maxPrice != null ? { $lte: maxPrice } : {}),
          }
        : null;

    const matchStage = {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        isDeleted: isDeleted ? true : false,
        ...(sku && { sku: { $regex: sku, $options: "i" } }),
        ...(name && { name: { $regex: name, $options: "i" } }),
        ...(gender && { gender }),
        ...(categories.length ? { category: { $in: categories } } : {}),
        ...(measurementType && { measurementType }),
        ...(sizes.length ? { size: { $in: sizes } } : {}),
        ...(perUnitCostFilter && { perUnitCost: perUnitCostFilter }),
      },
    };

    const facetStage = {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: "count" }],
      },
    };

    const result = await Product.aggregate([matchStage, facetStage]);
    const products = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "Products fetched successfully",
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { getProducts };
