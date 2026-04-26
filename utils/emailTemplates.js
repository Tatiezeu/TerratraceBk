exports.verificationEmail = (code) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=Inter:wght@400;600&display=swap');
        
        .container {
            max-width: 400px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 33, 71, 0.1);
            font-family: 'Inter', sans-serif;
            border: 1px solid #eef2f6;
        }
        .header {
            background: #002147;
            padding: 30px 20px;
            text-align: center;
        }
        .logo-box {
            display: inline-block;
            padding: 12px;
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            margin-bottom: 15px;
            border: 2px solid #D4AF37;
        }
        .logo {
            height: 50px;
            width: 50px;
            display: block;
        }
        .header h1 {
            color: #ffffff;
            font-family: 'Syne', sans-serif;
            font-size: 18px;
            margin: 0;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .content {
            padding: 35px 30px;
            text-align: center;
        }
        .content h2 {
            color: #002147;
            font-family: 'Syne', sans-serif;
            font-size: 18px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .code-box {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
            padding: 20px;
            border-radius: 20px;
            margin: 20px 0;
            box-shadow: 0 10px 25px rgba(212, 175, 55, 0.2);
        }
        .code {
            font-family: 'Syne', sans-serif;
            font-size: 48px;
            font-weight: 800;
            color: #ffffff;
            margin: 0;
            letter-spacing: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .footer {
            padding: 20px;
            text-align: center;
            background: #f8fafc;
            border-top: 1px solid #f1f5f9;
        }
        .footer p {
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            margin: 0;
        }
        .expire-msg {
            color: #ef4444;
            font-size: 12px;
            font-weight: 700;
            margin-top: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    </style>
</head>
<body style="background-color: #f4f7fa; padding: 20px;">
    <div class="container">
        <div class="header">
            <div class="logo-box">
                <img src="cid:logo" alt="TerraTrace" class="logo">
            </div>
            <h1>TERRATRACE</h1>
        </div>
        
        <div class="content">
            <h2>Verification Code</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Enter the secure code below to complete your authentication.</p>
            
            <div class="code-box">
                <h1 class="code">${code}</h1>
            </div>
            
            <p class="expire-msg">This code expires in 10 minutes</p>
        </div>
        
        <div class="footer">
            <p>Republic of Cameroon - National Land Registry</p>
        </div>
    </div>
</body>
</html>
`;



