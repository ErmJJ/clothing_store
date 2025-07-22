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
- 🧭 **[MongoDB Compass](https://www.mongodb.com/try/download/compass):** Interfaz gráfica para explorar y administrar datos en MongoDB de forma visual. (Opcional)
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