# SNIP ME - Salon Booking Platform

## About SNIP ME

**SNIP ME** is a modern salon booking application that connects customers with nearby salons and beauticians. Users can discover salons, browse services, and book appointments seamlessly. The platform supports multiple user roles including customers, salon owners, and administrators. Any Passionate Salon owner can create an account in this web application free of charge, while keep tracking

### Key Features
- **Customer Portal** - Search and book salon services nearby
- **Salon Owner Dashboard** - Manage bookings, services, and availability
- **Admin Panel** - Oversee platform operations and users
- **Real-time Availability** - Time slot management system
- **Secure Authentication** - JWT-based authentication for all users

---

## Project Structure

```
SNIP_ME/
├── Backend/                    # Java Spring Boot API Server
│   ├── src/main/java/         # Java source code
│   │   └── com/starc/snipme/
│   │       ├── controller/    # REST API endpoints
│   │       ├── services/      # Business logic
│   │       ├── repositories/  # Database queries
│   │       ├── model/         # Entity classes (User, Booking, TimeSlot, etc.)
│   │       ├── dto/           # Data Transfer Objects
│   │       ├── config/        # Spring configuration
│   │       └── security/      # JWT authentication
│   ├── src/main/resources/
│   │   ├── application.properties           # App configuration
│   │   └── application-secrets.properties   # Sensitive data (GITIGNORED)
│   ├── pom.xml                # Maven dependencies
│   └── .gitignore            # Ignore rules for Backend
│
├── Frontend/                   # HTML/CSS/JavaScript UI
│   ├── css/                   # Stylesheets
│   │   ├── home.css
│   │   ├── login.css
│   │   ├── customer_login.css
│   │   └── salon-owner-login.css
│   ├── js/                    # JavaScript logic
│   │   ├── main.js
│   │   ├── customer_login.js
│   │   └── salon-owner-login.js
│   ├── images/                # Image assets
│   ├── videos/                # Video assets
│   ├── about.html
│   ├── login.html
│   ├── customer_login.html
│   └── .gitignore            # Ignore rules for Frontend
│
├── Database/                   # SQL Server project
│   └── SNIP_ME/
│       └── SNIP_ME.sqlproj    # Database schema
│
├── index.html                 # Home page
└── .gitignore                # (Legacy - separate gitignore files are used)
```

---

## Getting Started

### Prerequisites
- **Java 11+** - For Backend(JDK21-recomended)
- **Maven** - Build tool for Backend
- **MySQL** - Database
- **Git** - Version control

### Backend Setup

#### 1. Create Secrets File

Since `application-secrets.properties` is gitignored for security, each developer must create it locally:

```bash
cd Backend/src/main/resources/
```

Create a new file: `application-secrets.properties`

PowerShell (Windows):
```powershell
New-Item -Path "Backend/src/main/resources/application-secrets.properties" -ItemType File -Force
```

Bash (Git Bash / Linux / macOS):
```bash
touch Backend/src/main/resources/application-secrets.properties
```

Add your local credentials:
```# IMPORTANT: This file contains sensitive data and should NEVER be committed to version control
# See .gitignore to ensure this file is excluded from git

# MySQL Database Credentials
spring.datasource.username=avnadmin
spring.datasource.password={ENTER_YOUR_ONLINE_DATABASE_PASSWORD}

# JWT Secret Key - Change this to a secure, random value in production
app.jwt.secret=YourSuperSecretKeyThatIsAtLeast32CharactersLong!


spring.datasource.url=jdbc:mysql://snip-me-blahblahblah.f.aivencloud.com:13934/defaultdb?sslMode=REQUIRED


# Dummy Email Configuration to stop Spring Boot from crashing
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=admin.snipme@gmail.com
spring.mail.password={ENTER_YOUR_12_DIGIT_MAIL_APP_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```


#### 2. Configure MySQL Database

## Getting Started with MySQL

If you're completely new to MySQL, the easiest way to begin is by installing the official MySQL Installer.

👉 **Download here:**  
[Download MySQL Installer](https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-community-8.0.45.0.msi)
1. Create a new database:
```sql
CREATE DATABASE snipme_db;
```

2. Update the database credentials in `application-secrets.properties` to match your setup

#### 3. Build and Run

```bash
cd Backend/
./mvnw spring-boot:run -DskipTests
```

On Windows PowerShell, run the wrapper as `.\mvnw.cmd spring-boot:run -DskipTests` from the `Backend` folder.

The API will run on `http://localhost:8080`

---

### Frontend Setup

1. Open `index.html` in a web browser, or
2. Use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

Then visit `http://localhost:8000`

---

## Sensitive Files & Gitignore

### Files That Are Gitignored

| File | Reason | Action |
|------|--------|--------|
| `Backend/src/main/resources/application-secrets.properties` | Contains database password & JWT secret | Create locally with your credentials |
| `Backend/target/` | Compiled classes & dependencies | Auto-generated |
| `Backend/.mvn/` | Maven wrapper | Auto-generated |
| `Frontend/node_modules/` | NPM dependencies | Auto-generated |
| `Frontend/.env` | Environment variables | Create if using Node.js |

If you need a local Frontend env file, create it with:

PowerShell (Windows):
```powershell
New-Item -Path "Frontend/.env" -ItemType File -Force
```

Bash (Git Bash / Linux / macOS):
```bash
touch Frontend/.env
```

---

## Database Configuration

The database schema is managed in the `Database/SNIP_ME/` folder.

Key entities:
- **User** - Base user class
- **Customer** - Customer profile
- **SalonOwner** - Salon owner profile
- **Admin** - Administrator profile
- **Booking** - Service bookings
- **TimeSlot** - Available time slots

Database is auto-created/updated by Hibernate (`spring.jpa.hibernate.ddl-auto=update`)

---

## Authentication

The application uses **JWT (JSON Web Token)** authentication:

1. User logs in with credentials
2. Server returns a JWT token
3. Client includes token in API requests
4. Server validates token for secured endpoints

Token expiration: **24 hours** (configurable in `application.properties`)

---

## Folder Ownership

- **Backend/** - Java/Spring developers
- **Frontend/** - Frontend/UI developers  
- **Database/** - Database administrators

Each folder has its own `.gitignore` for technology-specific rules.

---

## Troubleshooting

### Backend won't start
- Ensure MySQL is running
- Check `application-secrets.properties` exists with correct credentials
- Verify Java version: `java -version`

### Frontend not loading
- Check browser console for errors
- Ensure video/image paths are correct
- Clear browser cache and reload

### Database connection fails
- Verify MySQL username/password in `application-secrets.properties`
- Check MySQL is running: `mysql -u root -p`
- Ensure database name is `snipme_db`

---

## PayHere Payment Testing

The application uses **PayHere Sandbox** for payment processing. Use the following test card numbers to simulate different payment scenarios:

### ✅ Successful Payments

| Card Type | Card Number |
|-----------|------------|
| Visa | 4916217501611292 |
| MasterCard | 5307732125531191 |
| AMEX | 346781005510225 |

### ❌ Insufficient Funds

| Card Type | Card Number |
|-----------|------------|
| Visa | 4024007194349121 |
| MasterCard | 5459051433777487 |
| AMEX | 370787711978928 |

### 🚫 Limit Exceeded

| Card Type | Card Number |
|-----------|------------|
| Visa | 4929119799365646 |
| MasterCard | 5491182243178283 |
| AMEX | 340701811823469 |

### ⛔ Do Not Honor

| Card Type | Card Number |
|-----------|------------|
| Visa | 4929768900837248 |
| MasterCard | 5388172137367973 |
| AMEX | 374664175202812 |

### 🔴 Network Error

| Card Type | Card Number |
|-----------|------------|
| Visa | 4024007120869333 |
| MasterCard | 5237980565185003 |
| AMEX | 373433500205887 |

**Note:** Use any future expiry date (e.g., 12/27) and any 3-digit CVV for testing.

---

## Contributing

1. Create a local `application-secrets.properties` with your credentials
2. Make changes to your assigned folder
3. Test locally before pushing
4. Never commit sensitive files

---

## License

SNIP ME © 2026 All rights reserved.
