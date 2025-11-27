# Лабораторна робота 1 – Приклади авторизації

Репозиторій містить три прості Node.js‑аплікації, які демонструють різні підходи до авторизації:

- `basic_auth/` – HTTP Basic Auth через заголовок `Authorization`.
- `forms_auth/` – авторизація через HTML‑форму з cookie‑сесіями.
- `token_auth/` – авторизація токеном, модифікована під JWT (додаткове завдання).

## Інсталяція

```bash
cd /workspaces/ZahistLR1
npm install
```

Подальший запуск усіх апок – на порту `3000`, але **по черзі**.

Адреса доступу з браузера (Codespaces):

```text
https://probable-space-waddle-pjw6jrwjppgj3776v-3000.app.github.dev/
```

---

## 1. HTTP Basic Auth (`basic_auth`)

### Запуск сервера

```bash
cd /workspaces/ZahistLR1
node basic_auth/index.js
```

У терміналі з’являється:

```text
Example app listening on port 3000
```

### Логін/пароль

- Login: `DateArt`
- Password: `2408`

### Перевірка з терміналу (пруф)

```bash
curl -v -u DateArt:2408 https://probable-space-waddle-pjw6jrwjppgj3776v-3000.app.github.dev/
```

Фрагмент відповіді:

```text
>
< HTTP/1.1 200 OK
...
Hello DateArt
```

У логах сервера (`basic_auth/index.js`) видно розбір заголовка `Authorization`:

```text
=======================================================

authorizationHeader Basic RGF0ZUFydDoyNDA4
decodedAuthorizationHeader DateArt:2408
Login/Password DateArt 2408
```

**Висновок:** Basic Auth працює – логін/пароль беруться з заголовка `Authorization: Basic <base64(login:password)>`, при вірних даних сервер повертає `Hello DateArt`.

---

## 2. Forms Auth з cookie‑сесією (`forms_auth`)

### Запуск сервера

```bash
cd /workspaces/ZahistLR1
node forms_auth/index.js
```

У терміналі:

```text
Example app listening on port 3000
```

### Сценарій перевірки

1. Відкрити в браузері адресу репозиторію на порту 3000.
2. На сторінці відображається HTML‑форма (`forms_auth/index.html`).
3. Ввести облікові дані, наприклад:
	 - Login: `Login`
	 - Password: `Password`
4. Надіслати форму (кнопка Login).

### Пруфи з мережі та сесій

**Запит логіну:**

У DevTools → Network видно запит:

```text
POST /api/login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

login=Login&password=Password
```

**Відповідь сервера:**

```json
{
	"username": "Username"
}
``+

**Cookie‑сесія:**

У вкладці Cookies для домену присутній запис:

```text
session=<uuid>
```

У терміналі сервера видно вміст сесії при наступному запиті до `/`:

```text
{ username: 'Username', login: 'Login' }
```

**Висновок:** авторизація через форму працює, сервер створює та зберігає сесію, а клієнт ідентифікується через cookie `session`.

---

## 3. Token Auth з JWT (`token_auth`) – додаткове завдання

У варіанті `token_auth` стандартний токен було замінено на JWT за допомогою бібліотеки `jsonwebtoken`.

### Основні зміни в коді

У `token_auth/index.js` додано:

```javascript
const jwt = require('jsonwebtoken');
const SESSION_KEY = 'Authorization';
const JWT_SECRET = 'very_secret_key_change_me';
```

При логіні (`POST /api/login`) замість UUID‑токена формується JWT:

```javascript
if (user) {
	const payload = {
		username: user.username,
		login: user.login
	};

	const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

	return res.json({ token, username: user.username });
}
```

Middleware перевіряє заголовок `Authorization` і розшифровує JWT:

```javascript
app.use((req, res, next) => {
	const authHeader = req.get(SESSION_KEY);

	if (authHeader) {
		const token = authHeader.replace('Bearer ', '');
		try {
			const payload = jwt.verify(token, JWT_SECRET);
			req.session = payload;
		} catch (e) {
			req.session = {};
		}
	} else {
		req.session = {};
	}

	next();
});
```

### Запуск сервера

```bash
cd /workspaces/ZahistLR1
node token_auth/index.js
```

У терміналі:

```text
Example app listening on port 3000
```

### Сценарій перевірки й текстові пруфи

1. Відкрити адресу аплікації в браузері.
2. У формі ввести:
	 - Login: `Login`
	 - Password: `Password`
3. Після відправки форми й успішного логіну у DevTools → Network з’являється запит:

```text
POST /api/login HTTP/1.1
Content-Type: application/json

{"login":"Login","password":"Password"}
```

**Відповідь логіну з JWT:**

```json
{
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"username": "Username"
}
```

4. Клієнтський код (`token_auth/index.html`) зберігає цю відповідь у `sessionStorage`:

```javascript
sessionStorage.setItem('session', JSON.stringify(response.data));
```

Через DevTools → Application → Session Storage видно запис:

```json
{
	"session": "{\"token\":\"eyJhbGciOiJI...\",\"username\":\"Username\"}"
}
```

5. При наступному завантаженні сторінки фронтенд витягує токен і робить запит на `/` з заголовком `Authorization`:

```javascript
axios.get('/', {
	headers: {
		Authorization: token
	}
})
```

У DevTools → Network → `GET /` видно заголовок:

```text
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Відповідь сервера:**

```json
{
	"username": "Username",
	"logout": "http://localhost:3000/logout"
}
```

У браузері відображається повідомлення виду:

```text
Hello Username
```

### Декодування JWT (додатковий пруф)

Будь‑який отриманий токен можна вставити на https://jwt.io та побачити його payload. Типовий розшифрований payload має вигляд:

```json
{
	"username": "Username",
	"login": "Login",
	"iat": 1732720000,
	"exp": 1732723600
}
```

**Висновок:** додаткове завдання виконано – замість простого випадкового токена використовується підписаний JWT з інформацією про користувача й терміном дії. Клієнт зберігає токен і надсилає його в заголовку `Authorization` для доступу до захищеного ресурсу.
