<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
</head>

<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
        <td align="center">

            <!-- Container -->
            <table width="520" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                    <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px;text-align:center;color:#fff;">
                        <h2 style="margin:0;font-size:20px;letter-spacing:0.5px;">
                            Secure Password Reset
                        </h2>
                        <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">
                            ERP System Security Team
                        </p>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding:32px;color:#333;text-align:left;">

                        <h3 style="margin-top:0;font-size:18px;">Hello 👋</h3>

                        <p style="font-size:14px;color:#555;line-height:1.7;">
                            We received a request to reset the password for your account.
                            If you made this request, you can set a new password by clicking the button below.
                        </p>

                        <p style="font-size:14px;color:#555;line-height:1.7;">
                            For your security, this link will expire in <b>60 minutes</b>. If you did not request this change,
                            you can safely ignore this email — no action is required.
                        </p>

                        <!-- Button -->
                        <div style="text-align:center;margin:30px 0;">
                           <a href="{{ route('user.reset-password-form', ['token' => $token, 'email' => $email]) }}"
                               style="
                                    background:#4f46e5;
                                    color:#ffffff;
                                    padding:12px 26px;
                                    text-decoration:none;
                                    border-radius:8px;
                                    font-size:14px;
                                    font-weight:bold;
                                    display:inline-block;
                               ">
                                Reset Your Password
                            </a>
                        </div>

                        <p style="font-size:13px;color:#777;line-height:1.6;">
                            If the button doesn’t work, copy and paste this link into your browser:
                        </p>

                        <p style="font-size:12px;color:#4f46e5;word-break:break-all;">
                            {{ url('/user/reset-password-form?token=' . $token . '&email=' . $email) }}
                        </p>

                        <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">

                        <p style="font-size:12px;color:#999;line-height:1.6;">
                            Need help? Contact our support team anytime.<br>
                            This is an automated message, please do not reply.
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background:#f9fafb;text-align:center;padding:14px;font-size:12px;color:#888;">
                        © {{ date('Y') }} ERP System. All rights reserved.
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>