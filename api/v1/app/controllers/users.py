from flask import Blueprint, jsonify, request
from ..models.users import usersModel

users_endpoint = Blueprint('users_endpoint', __name__)

@users_endpoint.route('/users', methods=['GET'])
def get_users():
    userId = request.args.get('id')

    if userId:
        user = usersModel.get_by_id(userId)
        if user:
            return jsonify(user), 200
        return jsonify({"error": "Usuario no encontrado"}), 404

    users = usersModel.get_all()
    return jsonify(users), 200

@users_endpoint.route('/users', methods=['POST'])
def create_user():
    data = request.json
    user_id = usersModel.create(data)
    if user_id:
        return jsonify({"inserted_id": user_id}), 201
    return jsonify({"error": "No se pudo crear el usuario"}), 400

@users_endpoint.route('/users', methods=['PUT'])
def update_user():
    userId = request.args.get('id')
    data = request.json
    updated = usersModel.update(userId, data)
    if updated == 1:
        return jsonify({"message": "Usuario actualizado"}), 200
    return jsonify({"error": "No se pudo actualizar el usuario"}), 400

@users_endpoint.route('/users', methods=['DELETE'])
def delete_user():
    userId = request.args.get('id')
    deleted = usersModel.delete(userId)
    if deleted == 1:
        return jsonify({"message": "Usuario eliminado"}), 200
    return jsonify({"error": "No se pudo eliminar el usuario"}), 400