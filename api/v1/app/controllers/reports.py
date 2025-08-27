from flask import Blueprint, jsonify
from ..models.reports import reportsModel

reports_endpoint = Blueprint('reports_endpoint', __name__)

# 1. Listado de todas las marcas que tienen al menos una venta
@reports_endpoint.route('/reports/brands-with-sales', methods=['GET'])
def get_brands_with_sales():
    data = reportsModel.brands_with_sales()
    return jsonify(data), 200

# 2. Prendas vendidas y su cantidad restante en stock
@reports_endpoint.route('/reports/products-stock', methods=['GET'])
def get_products_stock():
    data = reportsModel.products_sold_and_stock()
    return jsonify(data), 200

# 3. Top 5 marcas más vendidas y su cantidad de ventas
@reports_endpoint.route('/reports/top-brands', methods=['GET'])
def get_top_brands():
    data = reportsModel.top_5_brands()
    return jsonify(data), 200

# 4. Usuarios con más compras realizadas
@reports_endpoint.route('/reports/top-users', methods=['GET'])
def get_top_users():
    data = reportsModel.top_users()
    return jsonify(data), 200

# 5. Promedio de calificación por producto
@reports_endpoint.route('/reports/product-ratings', methods=['GET'])
def get_product_ratings():
    data = reportsModel.average_ratings()
    return jsonify(data), 200
