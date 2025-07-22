# 🛍️ Clothing Store DB (MongoDB + Python)

Este proyecto es una aplicación en Python que gestiona una base de datos MongoDB llamada `clothing_store_db`. 
> Permite realizar operaciones CRUD genéricas y consultas avanzadas sobre colecciones de una tienda de ropa: marcas, productos, usuarios, ventas y reseñas.

---

## 📦 Estructura del Proyecto

```
/clothing_store
    ├── .env
    ├── /database
    │      └── clothing_db.py
    └── README.md
```

---

## 🔧 Tecnologías Utilizadas
- 🐍 **[Python 3.10+](https://www.python.org/downloads/):** Lenguaje principal del proyecto.
- 🧬 **[PyMongo](https://pymongo.readthedocs.io/):** Cliente oficial de MongoDB para Python. Permite operaciones CRUD y agregaciones.
- 🌱 **[Python-Dotenv](https://pypi.org/project/python-dotenv/):** Carga variables de entorno desde archivos `.env` de forma segura.
- 🌍 **[MongoDB Atlas](https://www.mongodb.com/atlas/database):** Plataforma de base de datos en la nube usada para el despliegue remoto.
> Opcional:
🧭 **[MongoDB Compass](https://www.mongodb.com/try/download/compass):** Interfaz gráfica para explorar y administrar datos en MongoDB de forma visual. 
---


## 🔑 Variables de Entorno

Crea un archivo `.env` con el siguiente contenido:

```env
MONGO_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<base_de_datos>?retryWrites=true&w=majority
```

---

## ▶️ Ejecución

Instala las dependencias necesarias:

```bash
pip install -r requirements.txt
```

Contenido del archivo `requirements.txt`:

```
blinker==1.9.0
click==8.2.1
colorama==0.4.6
dnspython==2.7.0
Flask==3.1.1
flask-cors==6.0.1
Flask-PyMongo==3.0.1
itsdangerous==2.2.0
Jinja2==3.1.6
MarkupSafe==3.0.2
pymongo==4.13.2
python-dotenv==1.1.1
Werkzeug==3.1.3
```

Luego ejecuta el script principal:

```bash
python clothing_db.py
```


---

## 📚 Funcionalidades

### 🔄 CRUD Genérico

- `insert_one(collection, document)`
- `insert_many(collection, documents)`
- `update_one(collection, filter, update)`
- `delete_one(collection, filter)`

### 📊 Consultas Especializadas

- `get_sold_quantity_by_date(date_str)`
- `get_brands_with_sales()`
- `get_sold_products_and_stock()`
- `get_top_5_brands_by_sales()`

---

## 🧪 Datos Iniciales de Ejemplo

### 🏷️ Colección: `brands`

```json
{
  "_id": { "$oid": "60f7d2a2e3b1c8b1f4d3a456" },
  "name": "Nike",
  "country": "USA"
}
```

### 👟 Colección: `products`

```json
{
  "_id": { "$oid": "60f7d2c1e3b1c8b1f4d3a457" },
  "name": "Air Max",
  "brand_id": { "$oid": "60f7d2a2e3b1c8b1f4d3a456" },
  "price": 120.0,
  "stock": 50
}
```

### 👤 Colección: `users`

```json
{
  "_id": { "$oid": "60f7d2e5e3b1c8b1f4d3a458" },
  "username": "juan01",
  "email": "juan01@example.com",
  "password": "pass123",
  "role": "customer",
  "created_at": { "$date": "2025-07-01T00:00:00Z" }
}
```

### 📝 Colección: `reviews`

```json
{
  "_id": { "$oid": "60f7d310e3b1c8b1f4d3a459" },
  "product_id": { "$oid": "60f7d2c1e3b1c8b1f4d3a457" },
  "user_id": { "$oid": "60f7d2e5e3b1c8b1f4d3a458" },
  "rating": 5,
  "comment": "Excelente calidad",
  "review_date": { "$date": "2025-07-05T00:00:00Z" }
}
```

### 💰 Colección: `sales`

```json
{
  "_id": { "$oid": "60f7d332e3b1c8b1f4d3a460" },
  "product_id": { "$oid": "60f7d2c1e3b1c8b1f4d3a457" },
  "user_id": { "$oid": "60f7d2e5e3b1c8b1f4d3a458" },
  "sale_date": { "$date": "2025-07-10T00:00:00Z" },
  "quantity": 5,
  "total": 600.0
}
```

---

## 📌 Ejemplos de Uso

```python
# Insertar nuevo usuario
store_db.insert_one("users", {
    "username": "ana05",
    "email": "ana05@example.com",
    "password": "ana123",
    "role": "customer",
    "created_at": datetime.now()
})

# Actualizar un campo
store_db.update_one("users", {"username": "ana05"}, {"email": "ana05_updated@example.com"})

# Eliminar usuario
store_db.delete_one("users", {"username": "ana05"})

# Consulta de ventas por fecha
store_db.get_sold_quantity_by_date("2025-07-10")
```

---

## 🚫 Manejo de Errores

- Verificación de conexión con `ping`.
- Mensajes en consola con colores ANSI:
  - ✅ Verde: Conexión exitosa.
  - ⚠️ Amarillo: Desconexión.
  - ❌ Rojo: Fallo de conexión.

---

### 📃 Licencia

Este proyecto es de uso académico y libre para modificación.

---

### 💻 Desarrollado por

- Julián Hernández
Estudiante de Ingeniería Informática – Costa Rica

---

# 🧾 API RESTful - Clothing Store

Esta API RESTful en **Python + Flask** expone los datos de la base de datos `clothing_store_db`, permitiendo operaciones CRUD sobre entidades clave de una tienda de ropa, así como reportes personalizados para análisis de ventas y productos.


## 📁 Estructura del Proyecto

```
/clothing_store
│   .env
│   README.md
└── api
    └── v1
        │   run.py
        └── app
            │   index.py
            ├── controllers/
            │   └── (Aquí van los controllers de las colecciones)
            └── models/
                └── (Aquí van los models de las colecciones)
```

---

## 🚀 URL Base

```
http://localhost:5000/clothing/api/v1
```

---

## 📦 Endpoints por Entidad

### 🧥 Products

- `GET /products`  
  Lista todos los productos.

- `GET /products?id=<product_id>`  
  Obtiene un producto por su ID.

- `POST /products`  
  Crea un nuevo producto.  
  **Body JSON**:
  ```json
  {
    "name": "Air Max",
    "brand_id": "687e0568afe2f82e75d68977",
    "price": 120,
    "stock": 50
  }
  ```

- `PUT /products?id=<product_id>`  
  Actualiza un producto existente.

- `DELETE /products?id=<product_id>`  
  Elimina un producto por ID.

---

### 🏷️ Brands

- `GET /brands`  
  Lista todas las marcas.

- `GET /brands?id=<brand_id>`  
  Obtiene una marca por ID.

- `POST /brands`  
  Crea una nueva marca.

- `PUT /brands?id=<brand_id>`  
  Actualiza una marca existente.

- `DELETE /brands?id=<brand_id>`  
  Elimina una marca por ID.

---

### 👤 Users

- `GET /users`  
  Lista todos los usuarios.

- `GET /users?id=<user_id>`  
  Obtiene un usuario por ID.

- `POST /users`  
  Crea un nuevo usuario.

- `PUT /users?id=<user_id>`  
  Actualiza un usuario existente.

- `DELETE /users?id=<user_id>`  
  Elimina un usuario por ID.

---

### 💸 Sales

- `GET /sales`  
  Lista todas las ventas.

- `GET /sales?id=<sale_id>`  
  Obtiene una venta por ID.

- `POST /sales`  
  Registra una nueva venta.  
  **Body JSON**:
  ```json
  {
    "product_id": "687e0568afe2f82e75d6897c",
    "quantity": 5,
    "total": 600,
    "sale_date": "2025-07-10",
    "user_id": "687e0568afe2f82e75d68981"
  }
  ```

- `PUT /sales?id=<sale_id>`  
  Actualiza una venta existente.

- `DELETE /sales?id=<sale_id>`  
  Elimina una venta por ID.

---

### 📝 Reviews

- `GET /reviews`  
  Lista todas las reseñas.

- `GET /reviews?id=<review_id>`  
  Obtiene una reseña por ID.

- `POST /reviews`  
  Crea una nueva reseña.

- `PUT /reviews?id=<review_id>`  
  Actualiza una reseña existente.

- `DELETE /reviews?id=<review_id>`  
  Elimina una reseña por ID.

---

## 📊 Endpoints de Reportes

### `GET /reports/brands-with-sales`

Devuelve las marcas que tienen al menos una venta registrada.

**Respuesta**:
```json
[
  {
    "brand_id": "687e0568afe2f82e75d68977",
    "name": "Nike",
    "country": "USA"
  }
]
```

---

### `GET /reports/sold-products-stock`

Devuelve los productos vendidos junto con el stock restante.

**Respuesta**:
```json
[
  {
    "product_id": "687e0568afe2f82e75d6897c",
    "name": "Air Max",
    "vendido": 5,
    "stock_restante": 45
  }
]
```

---

### `GET /reports/top-5-brands`

Devuelve las 5 marcas más vendidas según la cantidad total de productos vendidos.

**Respuesta**:
```json
[
  {
    "brand_id": "687e0568afe2f82e75d68977",
    "name": "Nike",
    "ventas_totales": 5
  }
]
```

---

### `GET /reports/sales-by-date?date=YYYY-MM-DD`

Devuelve todas las ventas realizadas en una fecha específica.

**Ejemplo**:
```
GET /reports/sales-by-date?date=2025-07-10
```

**Respuesta**:
```json
[
  {
    "_id": "687e0568afe2f82e75d6898b",
    "product_id": "687e0568afe2f82e75d6897c",
    "sale_date": "2025-07-10T00:00:00.000Z",
    "quantity": 5,
    "total": 600,
    "user_id": "687e0568afe2f82e75d68981"
  }
]
```

---

## ⚙️ Tecnologías Usadas

- 🌐 **[Flask](https://flask.palletsprojects.com/):** Framework web ligero para crear aplicaciones RESTful (opcional para extender este proyecto).
- 🔄 **[Flask-PyMongo](https://flask-pymongo.readthedocs.io/):** Extensión para integrar PyMongo fácilmente en proyectos Flask.
  
- Python 3
- Flask
- Flask-PyMongo
- Flask-CORS
- MongoDB Atlas
- Postman (para pruebas)

---

## 📌 Notas

- Todas las respuestas son en formato JSON.
- Las relaciones entre entidades usan `ObjectId` de MongoDB.
- Las rutas están versionadas bajo `/clothing/api/v1`.