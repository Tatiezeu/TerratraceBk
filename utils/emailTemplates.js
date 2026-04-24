exports.verificationEmail = (code) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        .card {
            max-width: 400px;
            margin: 0 auto;
            padding: 40px;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            text-align: center;
            font-family: 'Syne', sans-serif;
            border: 1px solid #f0f0f0;
        }
        .header {
            margin-bottom: 30px;
        }
        .logo {
            height: 40px;
            margin-bottom: 10px;
        }
        h2 {
            color: #002147;
            font-size: 24px;
            margin-bottom: 10px;
        }
        p {
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
        }
        .code-container {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 16px;
            border: 2px dashed #e2e8f0;
        }
        .code {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 12px;
            color: #10b981;
            margin: 0;
        }
        .footer {
            margin-top: 30px;
            font-size: 11px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
    </style>
</head>
<body style="background-color: #f1f5f9; padding: 40px 0;">
    <div class="card">
        <div class="header">
            <img src="cid:logo" alt="TerraTrace Logo" class="logo">
            <h2>Secure Verification</h2>
            <p>Use the code below to verify your identity on the TerraTrace Portal.</p>
        </div>
        
        <div class="code-container">
            <h1 class="code">${code}</h1>
        </div>
        
        <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        
        <div class="footer">
            Secured by TerraTrace Protocol
        </div>
    </div>
</body>
</html>
`;
