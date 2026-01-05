# Laravel Migration Plan: KanbanCRM

Migration from **Node.js/Express/Supabase** → **Laravel/MySQL** on Hostinger Shared Hosting

---

## Phase 1: Environment Setup

### 1.1 Local Development
```bash
# Install Composer (PHP package manager)
# Install Laravel
composer create-project laravel/laravel kanbancrm-api

# Install required packages
composer require laravel/socialite  # Google OAuth
composer require fruitcake/laravel-cors  # CORS for React frontend
```

### 1.2 Hostinger MySQL Configuration
Use your existing database: `u540387157_AGENTIX_CRM`

```env
# .env file
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u540387157_AGENTIX_CRM
DB_USERNAME=u540387157_AGENTIX
DB_PASSWORD=your_password

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=https://ai-agentix.com/api/auth/google/callback

GEMINI_API_KEY=your_gemini_key
```

---

## Phase 2: MySQL Database Schema

### 2.1 Migration Files to Create

```sql
-- users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url TEXT,
    role VARCHAR(50) DEFAULT 'editor',
    user_type VARCHAR(50) DEFAULT 'employee',
    shareholding_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- sessions table
CREATE TABLE sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL,
    INDEX idx_session_expire (expire)
);

-- clients table
CREATE TABLE clients (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    industry VARCHAR(255) NOT NULL,
    stage VARCHAR(50) DEFAULT 'Warm',
    average_progress DECIMAL(5,2) DEFAULT 0,
    expected_revenue DECIMAL(15,2) DEFAULT 0,
    revenue_total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    proposal_file_name VARCHAR(255),
    proposal_file_data LONGTEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- stories table
CREATE TABLE stories (
    id CHAR(36) PRIMARY KEY,
    client_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    assigned_to VARCHAR(255),
    priority VARCHAR(50) DEFAULT 'Medium',
    estimated_effort_hours INT DEFAULT 0,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'To Do',
    progress_percent INT DEFAULT 0,
    person VARCHAR(255) DEFAULT '',
    tags JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- comments table
CREATE TABLE comments (
    id CHAR(36) PRIMARY KEY,
    story_id CHAR(36) NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    body TEXT NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    attachment_name VARCHAR(255),
    attachment_type VARCHAR(100),
    attachment_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    INDEX idx_comments_story (story_id)
);

-- invoices table
CREATE TABLE invoices (
    id CHAR(36) PRIMARY KEY,
    client_id CHAR(36) NOT NULL,
    label VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    issued_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_data LONGTEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- activity_log table
CREATE TABLE activity_log (
    id CHAR(36) PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- founder_investments table
CREATE TABLE founder_investments (
    id CHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    invested_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- internal_documents table
CREATE TABLE internal_documents (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    uploaded_by_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_data LONGTEXT,
    external_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
);

-- sent_emails table
CREATE TABLE sent_emails (
    id CHAR(36) PRIMARY KEY,
    story_id CHAR(36) NOT NULL,
    client_id CHAR(36) NOT NULL,
    sent_by_id VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'drafted',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by_id) REFERENCES users(id)
);
```

---

## Phase 3: Laravel API Routes Mapping

| Current Node.js Route | Laravel Route | Controller Method |
|-----------------------|---------------|-------------------|
| `GET /api/auth/user` | `GET /api/auth/user` | `AuthController@user` |
| `GET /api/login` | `GET /api/login` | Socialite redirect |
| `GET /api/logout` | `GET /api/logout` | `AuthController@logout` |
| `GET /api/clients` | `GET /api/clients` | `ClientController@index` |
| `GET /api/clients/:id` | `GET /api/clients/{id}` | `ClientController@show` |
| `POST /api/clients` | `POST /api/clients` | `ClientController@store` |
| `PATCH /api/clients/:id` | `PATCH /api/clients/{id}` | `ClientController@update` |
| `DELETE /api/clients/:id` | `DELETE /api/clients/{id}` | `ClientController@destroy` |
| `GET /api/stories` | `GET /api/stories` | `StoryController@index` |
| `POST /api/stories` | `POST /api/stories` | `StoryController@store` |
| `PATCH /api/stories/:id` | `PATCH /api/stories/{id}` | `StoryController@update` |
| `DELETE /api/stories/:id` | `DELETE /api/stories/{id}` | `StoryController@destroy` |
| `GET /api/stories/:id/comments` | `GET /api/stories/{id}/comments` | `CommentController@index` |
| `POST /api/stories/:id/comments` | `POST /api/stories/{id}/comments` | `CommentController@store` |
| `POST /api/stories/:id/generate-email` | `POST /api/stories/{id}/generate-email` | `AIController@generateEmail` |
| `GET /api/stories/:id/emails` | `GET /api/stories/{id}/emails` | `EmailController@index` |
| `POST /api/stories/:id/emails` | `POST /api/stories/{id}/emails` | `EmailController@store` |
| `POST /api/upload` | `POST /api/upload` | `UploadController@store` |
| `GET /api/users` | `GET /api/users` | `UserController@index` |
| `PATCH /api/users/:id` | `PATCH /api/users/{id}` | `UserController@update` |
| `GET /api/activity` | `GET /api/activity` | `ActivityController@index` |
| And more... | ... | ... |

---

## Phase 4: Laravel Project Structure

```
kanbancrm-api/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── ClientController.php
│   │   │   ├── StoryController.php
│   │   │   ├── CommentController.php
│   │   │   ├── InvoiceController.php
│   │   │   ├── UserController.php
│   │   │   ├── AIController.php      # Gemini integration
│   │   │   └── UploadController.php
│   │   └── Middleware/
│   │       └── CoFounderMiddleware.php
│   └── Models/
│       ├── User.php
│       ├── Client.php
│       ├── Story.php
│       ├── Comment.php
│       ├── Invoice.php
│       └── ...
├── routes/
│   └── api.php
├── config/
│   └── services.php  # Google OAuth config
└── .env
```

---

## Phase 5: File Storage Strategy

### Current: Supabase Storage → New: Local Storage (public folder)

```php
// UploadController.php
public function store(Request $request)
{
    $file = $request->file('file');
    $bucket = $request->input('bucket'); // invoices, documents, etc.
    
    $fileName = Str::random(16) . '.' . $file->getClientOriginalExtension();
    $path = $file->storeAs("uploads/{$bucket}", $fileName, 'public');
    
    return response()->json([
        'publicUrl' => asset("storage/{$path}"),
        'fileName' => $file->getClientOriginalName()
    ]);
}
```

---

## Phase 6: Google OAuth with Socialite

```php
// config/services.php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URL'),
],

// AuthController.php
public function redirect()
{
    return Socialite::driver('google')->redirect();
}

public function callback()
{
    $googleUser = Socialite::driver('google')->user();
    
    $user = User::updateOrCreate(
        ['email' => $googleUser->email],
        [
            'id' => $googleUser->id,
            'first_name' => $googleUser->user['given_name'] ?? null,
            'last_name' => $googleUser->user['family_name'] ?? null,
            'profile_image_url' => $googleUser->avatar,
        ]
    );
    
    Auth::login($user);
    return redirect('/');
}
```

---

## Phase 7: React Frontend Changes

### Minimal changes needed:
1. Update API base URL in `.env`:
   ```env
   VITE_API_URL=https://ai-agentix.com/api
   ```

2. Remove Supabase client usage (database operations now via API)

3. Build and deploy to Hostinger:
   ```bash
   npm run build
   # Upload dist/ folder to public_html/
   ```

---

## Phase 8: Deployment to Hostinger

### Backend (Laravel API):
1. Upload Laravel project to `public_html/api/` or subdomain
2. Configure `.env` with MySQL credentials
3. Run migrations: `php artisan migrate`
4. Set permissions: `chmod -R 775 storage bootstrap/cache`

### Frontend (React):
1. Build: `npm run build`
2. Upload `dist/` contents to `public_html/`
3. Add `.htaccess` for SPA routing:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

---

## Timeline Estimate

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Laravel setup & config | 2 |
| 2 | MySQL schema creation | 3 |
| 3 | API routes & controllers | 12-15 |
| 4 | Google OAuth | 3 |
| 5 | File uploads | 3 |
| 6 | Gemini AI integration | 3 |
| 7 | Frontend adjustments | 2 |
| 8 | Deployment & testing | 4 |
| **Total** | | **32-35 hours** |

---

## ⚠️ Important Notes

1. **Data Migration**: You'll need to export data from Supabase and import to MySQL
2. **Co-founder Email Check**: Replicate the `isCoFounderEmail` logic in Laravel middleware
3. **CORS**: Configure Laravel CORS for your React frontend domain
4. **Session**: Use database or file sessions instead of Supabase

---

## Do You Want to Proceed?

Reply with:
- **"YES, start Laravel setup"** - I'll begin creating the Laravel project
- **"Need clarification on X"** - Ask any questions first
- **"Cancel"** - Stay with current Node.js setup
