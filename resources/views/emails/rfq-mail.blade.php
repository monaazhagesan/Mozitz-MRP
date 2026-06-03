<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Request for Quotation (RFQ)</title>
</head>

<body style="margin:0; padding:0; background:#eef2f7; font-family:Arial, sans-serif;">

<div style="max-width:700px; margin:30px auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#2c3e50; padding:20px; color:#fff;">
        <h2 style="margin:0;">Request for Quotation (RFQ)</h2>
    </div>

    <div style="padding:25px; font-size:14px; color:#333; line-height:1.6;">

        <p>Dear Sir/Madam,</p>

        <p>Greetings from <strong>{{ $company?->company ?? 'N/A' }}</strong>.</p>

        <p>
            We would like to request a quotation for the following items:
        </p>

        <!-- RFQ Details -->
        <h3>RFQ Details</h3>

        <table style="width:100%; border-collapse:collapse;">
            <tr><td><strong>RFQ No</strong></td><td>{{ $rfq['rfq_number'] }}</td></tr>
            <tr><td><strong>RFQ Date</strong></td><td>{{ $rfq->created_at->format('d-m-Y') }}</td></tr>
            <tr><td><strong>Required Date</strong></td><td>{{ $rfq->items->first()->required_date ?? 'N/A' }}</td></tr>

        </table>

        <!-- Items -->
        <h3 style="margin-top:20px;">Items Requested</h3>

        <table width="100%" border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;">
            <thead style="background:#2c3e50; color:#fff;">
                <tr>
                    <th>S.No</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
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

        <!-- Delivery -->
        <h3 style="margin-top:20px;">Delivery Location</h3>
        <p>{{ $rfq->delivery_location ?? 'N/A' }}</p>

        <!-- Notes -->
        <h3>Additional Notes</h3>
        <ul>
            <li>Please share your best pricing, delivery timeline, and payment terms.</li>
            <li>Kindly send your quotation on or before <strong>{{ $rfq->items->first()->required_date ?? 'N/A' }}</strong>.</li>
        </ul>

        <p>
            Thank you and looking forward to your response.
        </p>

        <p>
    Best Regards,<br>

    {{ $company?->company ?? 'N/A' }}<br>
    Email: {{ $company?->email ?? 'N/A' }}<br>
    Phone: {{ $company?->phone ?? 'N/A' }}
</p>

    </div>
</div>

</body>
</html>