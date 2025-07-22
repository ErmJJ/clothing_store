from flask import Blueprint, jsonify, request
from ..models.products import productsModel

products_endpoint = Blueprint('products_endpoint', __name__)

@products_endpoint.route('/products', methods=['GET'])
def get_products():
    productId = request.args.get('id')

    if productId:
        product = productsModel.get_by_id(productId)
        if product:
            return jsonify(product), 200
        return jsonify({"error": "Producto no encontrado"}), 404

    products = productsModel.get_all()
    return jsonify(products), 200

@products_endpoint.route('/products', methods=['POST'])
def create_product():
    data = request.json
    product_id = productsModel.create(data)
    if product_id:
        return jsonify({"inserted_id": product_id}), 201
    return jsonify({"error": "No se pudo crear el producto"}), 400

@products_endpoint.route('/products', methods=['PUT'])
def update_product():
    productId = request.args.get('id')
    data = request.json
    updated = productsModel.update(productId, data)
    if updated == 1:
        return jsonify({"message": "Producto actualizado"}), 200
    return jsonify({"error": "No se pudo actualizar el producto"}), 400

@products_endpoint.route('/products', methods=['DELETE'])
def delete_product():
    productId = request.args.get('id')
    deleted = productsModel.delete(productId)
    if deleted == 1:
        return jsonify({"message": "Producto eliminado"}), 200
    return jsonify({"error": "No se pudo eliminar el producto"}), 400