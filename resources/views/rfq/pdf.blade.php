<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>RFQ - {{ $rfq['rfq_number'] }}</title>

<style>
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #333;
        background: #fff;
    }

    /* CENTER FIX (IMPORTANT FOR PDF) */
    .page {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .container {
        width: 650px;   /* FIXED WIDTH FOR PERFECT CENTER */
        padding: 25px;
    }

    /* HEADER */
    .header {
        background: #1f2d3d;
        color: #fff;
        padding: 18px;
        text-align: center;
        margin-bottom: 25px;
    }

    .header h2 {
        margin: 0;
        font-size: 20px;
        letter-spacing: 1px;
    }

    p {
        margin: 6px 0;
        font-size: 13px;
        line-height: 1.6;
    }

    /* SECTION SPACING FIX */
    .section {
        margin-top: 35px;   /* IMPORTANT GAP ABOVE EVERY SECTION */
    }

    .title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 12px;
        color: #1f2d3d;
        border-left: 4px solid #1f2d3d;
        padding-left: 10px;
    }

    /* INFO TABLE */
    .info-table {
        width: 100%;
        border-collapse: collapse;
    }

    .info-table td {
        padding: 10px;
        border: 1px solid #ddd;
        font-size: 13px;
    }

    .info-table td:first-child {
        width: 35%;
        font-weight: bold;
        background: #f4f6f8;
    }

    /* ITEMS TABLE */
    .items-table {
        width: 100%;
        border-collapse: collapse;
    }

    .items-table th {
        background: #1f2d3d;
        color: #fff;
        padding: 10px;
        text-align: left;
    }

    .items-table td {
        border: 1px solid #ddd;
        padding: 10px;
    }

    .items-table tr:nth-child(even) {
        background: #f9f9f9;
    }

    /* NOTES */
    .note-list {
        margin: 10px 0 0 18px;
        font-size: 13px;
        line-height: 1.6;
    }

    .note-list li {
        margin-bottom: 6px;
    }

    /* FOOTER */
    .footer {
        margin-top: 40px;
        padding-top: 15px;
        border-top: 1px solid #eee;
        font-size: 13px;
        line-height: 1.7;
    }

</style>
</head>

<body>

<div class="page">
<div class="container">

    <!-- HEADER -->
    <div class="header">
        <h2>REQUEST FOR QUOTATION (RFQ)</h2>
    </div>

    <!-- INTRO -->
    <div>
        <p>Dear Sir/Madam,</p>
        <p>Greetings from <strong>{{ $company?->name ?? 'N/A' }}</strong>.</p>
        <p>Please find below the details of our RFQ.</p>
    </div>

    <!-- RFQ DETAILS -->
    <div class="section">
        <div class="title">RFQ DETAILS</div>

        <table class="info-table">
            <tr>
                <td>RFQ Number</td>
                <td>{{ $rfq['rfq_number'] }}</td>
            </tr>
            <tr>
                <td>RFQ Date</td>
                <td>{{ isset($rfq['created_at']) ? \Carbon\Carbon::parse($rfq['created_at'])->format('d-m-Y') : 'N/A' }}</td>
            </tr>
            <tr>
                <td>Required Date</td>
                <td>{{ $rfq['items'][0]['required_date'] ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td>Delivery Location</td>
                <td>{{ $rfq['delivery_location'] ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    <!-- ITEMS -->
    <div class="section">
        <div class="title">ITEMS REQUESTED</div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width:10%;">S.No</th>
                    <th>Product Name</th>
                    <th style="width:20%;">Quantity</th>
                </tr>
            </thead>
            <tbody>
                @foreach($rfq['items'] as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item['item_name'] }}</td>
                    <td>{{ $item['quantity'] }} Nos</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- NOTES -->
    <div class="section">
        <div class="title">NOTES</div>

        <ul class="note-list">
            <li>Please share your best pricing, delivery timeline, and payment terms.</li>
            <li>Submit quotation before <strong>{{ $rfq['items'][0]['required_date'] ?? 'N/A' }}</strong>.</li>
        </ul>
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <p>Thank you and looking forward to your response.</p>

        <p>
             Best Regards,<br>
    
    {{ $company?->name ?? 'N/A' }}<br>
    Email: {{ $company?->email ?? 'N/A' }}<br>
    Phone: {{ $company?->phone ?? 'N/A' }}
</p>
    </div>

</div>
</div>

</body>
</html>