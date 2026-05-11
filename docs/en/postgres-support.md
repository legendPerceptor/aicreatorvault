# PostgreSQL Database Support

> [中文版](../zh/postgres-support.md)


## Install PostgreSQL

Assuming you're on an Ubuntu system, you can quickly install PostgreSQL 16 with the following commands.

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo apt install postgresql-16-pgvector
```

## Configure PostgreSQL Database

To use PostgreSQL, we need to manually run the following commands.

```bash
# Switch to postgres user and create database and user
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE aicreatorvault OWNER postgres;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aicreatorvault TO postgres;"
```

You can connect to the PostgreSQL database with:

```bash
sudo -u postgres psql -d aicreatorvault
```

Change the password with the following SQL:

```sql
ALTER USER postgres PASSWORD 'Your_password';
```

You can log in this way for easy script execution:

```bash
PGPASSWORD='Your_password' psql -h localhost -U aicreator -d aicreatorvault -c "SELECT version();"
```

Enable the vector extension with the following command:

```bash
PGPASSWORD='Your_password' psql -h localhost -U aicreator -d aicreatorvault -c "CREATE EXTENSION vector;"
```

## Change a user's password

To change the password of a user (in case you forget the password).

```bash
node -e "const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync('your_new_password', 10); console.log(hash);"
```

```bash
docker exec -it aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault
UPDATE "Users" SET password_hash = '<paste_the_hash_here>' WHERE email = '<your_email@example.com>';
```
