
# Flask Lyrics

## Overview

This is a full-stack web application designed for learning Japanese through vocabulary lookup and interactive song lyrics. The project is containerized using Docker and Docker Compose, making it easy to set up and run.

The application consists of a Flask backend, a React frontend, and a MySQL database, all orchestrated by a multi-container setup with Nginx acting as a reverse proxy.

## Architecture

The application is built with the following components, each running in its own Docker container:

-   **`web`**: A Python Flask application served by Gunicorn. It handles the REST API endpoints for user authentication, word lookups, and lyrics retrieval. It also serves the static React frontend files.
    
-   **`db`**: A MySQL 8.0 database for persistent data storage, including user information.
    
-   **`nginx`**: An Nginx reverse proxy that routes incoming web traffic to the Flask backend. It is configured to handle SSL/TLS termination and redirect HTTP traffic to HTTPS.
    

The project uses a multi-stage Dockerfile to build the web service, first compiling the React frontend and then bundling it with the Flask backend into a single, optimized image.

## Getting Started

### Prerequisites

To run this project, you need to have the following installed on your machine:

-   [**Docker**](https://www.docker.com/get-started/ "null")
    
-   [**Docker Compose**](https://docs.docker.com/compose/install/ "null")
    

### Installation & Usage

1.  **Clone the repository:**
    
    ```
    git clone [your_repository_url]
    cd [your_project_directory]
    
    ```
    
2.  **Create a `.env` file:** The project uses environment variables for configuration. Create a file named `.env` in the root directory and add the following variables. **Note: Replace the placeholder values with your own.**
    
    ```
    # Database Configuration
    MYSQL_ROOT_PASSWORD=your_root_password
    MYSQL_DATABASE=your_database_name
    MYSQL_USER=your_db_user
    MYSQL_PASSWORD=your_db_password
    DATABASE_URL=mysql+pymysql://your_db_user:your_db_password@db:3306/your_database_name
    
    # Flask Application Configuration
    SECRET_KEY=a_secure_random_string_for_flask_session
    JWT_SECRET_KEY=another_secure_random_string_for_jwt
    
    # Flask-Session Configuration
    SESSION_PERMANENT=True
    SESSION_TYPE=filesystem
    PERMANENT_SESSION_LIFETIME_SECONDS=36000
    
    ```
    
3.  **Start the containers:** Run the following command to build the Docker images and start all the services in detached mode (`-d`). The `--build` flag ensures that the latest images are built from the Dockerfiles.
    
    ```
    docker-compose up -d --build
    
    ```
    
    The first time you run this, it will take some time as it downloads the base images, builds the web and Nginx images, and initializes the database.
    
4.  **Access the Application:** Once the containers are running, the application will be accessible via Nginx. The Nginx configuration in `nginx.conf` is currently set up to listen on ports `8081` (HTTP) and `8444` (HTTPS).
    
    -   The application is configured for the domain `example.com`. You will need to modify the `nginx.conf` to use your own domain or access it via `localhost:8081` or `localhost:8444`.
        

### Stopping the Application

To stop and remove the running containers, volumes, and networks, use:

```
docker-compose down -v

```

The `-v` flag removes the named volume `db_data` which contains your database data. Use this with caution if you want to preserve your data.

## Project Notes

-   **Database Persistence**: The `db_data` named volume ensures that your MySQL data is persisted even if the database container is stopped or removed.
    
-   **Static Assets**: The `Dockerfile.web` handles the entire frontend build process. It compiles the React application and copies the static assets into the Flask `static` folder, allowing Flask to serve the frontend.
    
-   **Nginx Configuration**: The `nginx.conf` file is a reverse proxy configuration that redirects all HTTP traffic on port `8081` to HTTPS on port `8444`. It also passes all requests to the `web` service.
