# RENATHA: Project Setup and Installation Guide

This guide covers the necessary steps to set up and run the RENATHA Pharmacy Inventory System on both **Windows** and **Linux** environments. 

The project is structured into two parts:
1. **Backend:** FastAPI (Python)
2. **Frontend:** React.js + Vite (Node.js) - *Pending implementation*

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Python 3.10 or higher**: [Download here](https://www.python.org/downloads/)
2. **Node.js (LTS version, 20.x or higher)**: [Download here](https://nodejs.org/)
3. **Git**: [Download here](https://git-scm.com/downloads)

### ⚠️ IMPORTANT: VS Code Markdown Reader
Because this project utilizes comprehensive `.md` files for documentation (like the one you are reading!), **you MUST use a Markdown Reader in VS Code** to view them properly and avoid raw text formatting issues.
*   **Recommendation:** Install the `Markdown Preview Enhanced` extension, or simply use VS Code's built-in preview by opening any `.md` file and pressing `Ctrl+Shift+V` (`Cmd+Shift+V` on Mac).

*(Note: The backend currently defaults to a local SQLite database `renatha.db` for easy development. You do not need to install MySQL unless you are preparing for production).*

---

## 🚀 1. Backend Setup (FastAPI)

Open your terminal (Linux) or PowerShell/Command Prompt (Windows) and navigate to the root of the project directory.

### Windows Installation

```powershell
# 1. Navigate into the backend directory
cd backend

# 2. Create a Python Virtual Environment
python -m venv venv

# 3. Activate the Virtual Environment
.\venv\Scripts\activate

# 4. Install the required Python dependencies
pip install fastapi[all] uvicorn sqlalchemy alembic pymysql passlib[bcrypt] python-jose python-dotenv

# 5. Run Database Migrations (Creates the local SQLite database)
alembic upgrade head

# 6. Start the FastAPI Development Server
uvicorn app.main:app --reload
```

### Linux Installation

```bash
# 1. Navigate into the backend directory
cd backend

# 2. Create a Python Virtual Environment
python3 -m venv venv

# 3. Activate the Virtual Environment
source venv/bin/activate

# 4. Install the required Python dependencies
pip install fastapi[all] uvicorn sqlalchemy alembic pymysql passlib[bcrypt] python-jose python-dotenv

# 5. Run Database Migrations (Creates the local SQLite database)
alembic upgrade head

# 6. Start the FastAPI Development Server
uvicorn app.main:app --reload
```

**Testing the Backend:**
Once the server is running, open your web browser and navigate to:
*   **API Root:** `http://127.0.0.1:8000/`
*   **Interactive API Docs (Swagger UI):** `http://127.0.0.1:8000/docs`

---

## 💻 2. Frontend Setup (React.js + Vite)
*(The frontend directory will be created in the next phase. Once created, follow these steps).*

### Windows & Linux Installation

The commands for setting up the Node.js frontend are identical across both operating systems. Open a **new terminal window** (keep the backend server running in the other one) and navigate to the project root.

```bash
# 1. Navigate into the frontend directory
cd frontend

# 2. Install all Node.js dependencies
npm install

# 3. Start the Vite Development Server
npm run dev
```

**Testing the Frontend:**
Once the Vite server starts, it will output a local URL (typically `http://localhost:5173`). Open that link in your browser to view the application.

---

## 🛑 Troubleshooting

*   **"uvicorn is not recognized as an internal or external command" (Windows):** Ensure that your virtual environment is activated (`.\venv\Scripts\activate`) before running the uvicorn command. You should see `(venv)` at the beginning of your terminal prompt.
*   **"ModuleNotFoundError: No module named 'fastapi'":** You forgot to run `pip install` inside the active virtual environment.
*   **Database connection errors:** By default, the system uses SQLite. If you added a `.env` file with a `DATABASE_URL` pointing to MySQL, ensure your MySQL service (like XAMPP or native MySQL) is running and the credentials are correct.
