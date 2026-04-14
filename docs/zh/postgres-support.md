# 支持Postgres数据库

> [English](../en/postgres-support.md)


## 安装postgres

假设在Ubuntu系统上，可以用下面的命令快速安装postgres 16发行版。

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo apt install postgresql-16-pgvector
```

## 配置postgres数据库

为了使用Postgres数据库，我们需要手工运行下列命令。

```bash
# 切换到 postgres 用户并创建数据库和用户
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE aigc_assistant OWNER postgres;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aigc_assistant TO postgres;"
```

可以用下面的方式连接到Postgres数据库

```bash
sudo -u postgres psql -d aigc_assistant
```

用下面的SQL语句修改密码

```sql
ALTER USER postgres PASSWORD 'Your_password';
```

可以用下面的方式登录，方便脚本运行。

```bash
PGPASSWORD='Your_password' psql -h localhost -U postgres -d aigc_assistant -c "SELECT version();"
```

使用下面的命令启用vector扩展。

```bash
PGPASSWORD='Your_password' psql -h localhost -U postgres -d aigc_assistant -c "CREATE EXTENSION vector;"
```
