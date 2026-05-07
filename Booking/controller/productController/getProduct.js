const Product = require('../../models/productModel');
const isValidMongoId = require('../../../utils/validateMongoId');

const getProduct = async (req, res) => {
  try {
    const product_id = req.params.id;

    if (!isValidMongoId(product_id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await Product.findOne({
      _id: product_id,
      organizationId: req.decoded.ordId,
      isDeleted: false,
    });
    

    if (!product) {
      return res.status(400).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product For given ID', data: product });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { getProduct };