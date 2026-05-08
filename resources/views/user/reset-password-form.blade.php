<!DOCTYPE html>
<html>
<head>
    <title>Reset User Password</title>
    <style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: Arial,sans-serif;}

        body {
            display:flex;
            justify-content:center;
            align-items:center;
            min-height:100vh;
            background:linear-gradient(135deg,#667eea,#764ba2);
            color:#333;
        }

        .card {
            background:#fff;
            padding:40px 30px;
            border-radius:12px;
            box-shadow:0 8px 20px rgba(0,0,0,0.2);
            width:100%;
            max-width:400px;
            text-align:center;
        }

        h2 { margin-bottom:24px; color:#333; }

        label {
            display:block;
            text-align:left;
            margin-bottom:6px;
            font-weight:bold;
            font-size:14px;
            color:#555;
        }

        .form-group { margin-bottom:16px; }

        .password-wrapper {
            position: relative;
        }

        input[type="password"],
        input[type="text"] {
            width:100%;
            padding:10px 40px 10px 12px;
            border:1px solid #ccc;
            border-radius:8px;
            font-size:14px;
            transition:border-color 0.3s;
        }

        input:focus {
            border-color:#667eea;
            outline:none;
        }

        .toggle-eye {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            font-size: 16px;
            user-select: none;
            color: #666;
        }

        button {
            width:100%;
            padding:12px;
            background:linear-gradient(90deg,#667eea,#764ba2);
            border:none;
            color:#fff;
            font-weight:bold;
            font-size:16px;
            border-radius:8px;
            cursor:pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        button:hover {
            transform:translateY(-2px);
            box-shadow:0 6px 15px rgba(0,0,0,0.2);
        }

        button:active {
            transform:translateY(0);
            box-shadow:none;
        }

        .status {
            margin-bottom: 16px;
            color: green;
            font-weight: bold;
            text-align: center;
        }

        /* Toast */
        #toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            min-width: 200px;
            padding: 12px 20px;
            border-radius: 8px;
            color: #fff;
            font-weight: bold;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s, transform 0.4s;
            z-index: 1000;
        }

        #toast.show {
            opacity: 1;
            transform: translateY(-10px);
        }

        #toast.success { background-color: #28a745; }
        #toast.error { background-color: #dc3545; }
    </style>
</head>

<body>
    <div class="card">
        <h2>Reset Password</h2>

        @if (session('status'))
            <div class="status">{{ session('status') }}</div>
        @endif

        <form id="resetForm" action="{{ url('/user/reset-password-submit') }}" method="POST">
            @csrf

            <input type="hidden" name="token" value="{{ $token }}">
            <input type="hidden" name="email" value="{{ $email }}">

            <div class="form-group">
                <label>New Password:</label>
                <div class="password-wrapper">
                    <input type="password" name="password" id="password" required>
                    <span class="toggle-eye" onclick="togglePassword('password')">👁️</span>
                </div>
            </div>

            <div class="form-group">
                <label>Confirm Password:</label>
                <div class="password-wrapper">
                    <input type="password" name="password_confirmation" id="password_confirmation" required>
                    <span class="toggle-eye" onclick="togglePassword('password_confirmation')">👁️</span>
                </div>
            </div>

            <button type="submit">Reset Password</button>
        </form>
    </div>

    <div id="toast"></div>

    <script>
        const form = document.getElementById('resetForm');
        const toast = document.getElementById('toast');

        function showToast(message, type = 'success') {
            toast.textContent = message;
            toast.className = `show ${type}`;
            setTimeout(() => toast.className = '', 3000);
        }

        // 👁️ TOGGLE PASSWORD (NO ICON CHANGE)
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);

            if (input.type === "password") {
                input.type = "text";
            } else {
                input.type = "password";
            }
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(form);

            const data = {
                token: formData.get('token'),
                email: formData.get('email'),
                password: formData.get('password'),
                password_confirmation: formData.get('password_confirmation'),
                _token: formData.get('_token')
            };

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showToast(result.message, 'success');
                    setTimeout(() => window.location.href = '/auth', 1500);
                } else {
                    showToast(result.message || "Error resetting password", 'error');
                }

            } catch (err) {
                console.error(err);
                showToast("Something went wrong. Check console.", 'error');
            }
        });
    </script>
</body>
</html>