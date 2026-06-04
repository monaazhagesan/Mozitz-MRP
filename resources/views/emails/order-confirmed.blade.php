<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <style>
        @media only screen and (max-width:600px) {
            .container { width: 100% !important; }
            .padding { padding: 16px !important; }
            .title { font-size: 18px !important; }
        }
    </style>
</head>

<body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8fb;padding:20px 0;">
<tr>
<td align="center">

<!-- MAIN CONTAINER -->
<table width="600" class="container" cellpadding="0" cellspacing="0" border="0"
       style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">

    <!-- HEADER -->
    <tr>
        <td style="background:#1a56db;padding:30px;text-align:center;color:#fff;">
            <div class="title" style="font-size:22px;font-weight:bold;">
                Order Confirmed 🎉
            </div>
            <div style="font-size:14px;margin-top:5px;opacity:0.9;">
                Thank you for your purchase
            </div>
        </td>
    </tr>

    <!-- BODY -->
    <tr>
        <td class="padding" style="padding:25px;">

            <p style="font-size:15px;color:#111;margin:0 0 10px;">
                Dear <strong>{{ $order->customer }}</strong>,
            </p>

            <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 20px;">
                Your order has been successfully confirmed. Below is your order summary.
            </p>

            <!-- ORDER SUMMARY -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#f9fafb;border-radius:8px;padding:10px;">

                <tr>
                    <td style="padding:6px;color:#666;">Order Number</td>
                    <td align="right"><b>{{ $order->order_no }}</b></td>
                </tr>

                <tr>
                    <td style="padding:6px;color:#666;">Order Date</td>
                    <td align="right">{{ $order->order_date ?? now()->toDateString() }}</td>
                </tr>

                <tr>
                    <td style="padding:6px;color:#666;">Status</td>
                    <td align="right">
                        <span style="background:#d1fae5;color:#065f46;padding:4px 10px;border-radius:20px;font-size:12px;">
                            {{ $order->status }}
                        </span>
                    </td>
                </tr>

                <tr>
                    <td style="padding:6px;color:#666;">Order Type</td>
                    <td align="right">{{ $order->order_type ?? 'Standard' }}</td>
                </tr>

                <tr>
                    <td style="padding:6px;color:#666;">Expected Delivery</td>
                    <td align="right">{{ $order->expected_delivery_date ?? '-' }}</td>
                </tr>

                <tr>
                    <td style="padding:6px;color:#666;">Shipping Address</td>
                    <td align="right" style="word-break:break-word;">
                        {{ $order->shipping_address ?? '-' }}
                    </td>
                </tr>

            </table>

            <!-- CONTACT -->
            <div style="margin-top:20px;border:1px solid #e5e7eb;border-radius:8px;padding:15px;">

                <b style="font-size:13px;color:#666;text-transform:uppercase;">
                    Contact Information
                </b>

                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                    <div>{{ $order->customer ?? '-' }}</div>
                    <div>{{ $order->contact_number ?? '-' }}</div>
                    <div>{{ $order->email ?? '-' }}</div>
                </div>

            </div>

            <!-- ITEMS -->
            <div style="margin-top:20px;">
                <b style="font-size:13px;color:#666;text-transform:uppercase;">
                    Items Ordered
                </b>
            </div>

            <!-- MOBILE SAFE TABLE WRAPPER -->
            <div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:10px;">

                <table width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="border:1px solid #e5e7eb;font-size:13px;min-width:600px;">

                    <thead>
                        <tr style="background:#1a56db;color:#fff;">
                            <th style="padding:10px;text-align:left;white-space:nowrap;">Item Code</th>
                            <th style="padding:10px;text-align:left;">Item Name</th>
                            <th style="padding:10px;text-align:center;white-space:nowrap;">Qty</th>
                            <th style="padding:10px;text-align:right;white-space:nowrap;">Rate</th>
                            <th style="padding:10px;text-align:right;white-space:nowrap;">Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        @foreach($order->items as $item)
                        <tr style="border-top:1px solid #e5e7eb;">
                            <td style="padding:10px;white-space:nowrap;">
                                {{ $item->item_code }}
                            </td>

                            <td style="padding:10px;word-break:break-word;">
                                {{ $item->item_name }}
                            </td>

                            <td style="padding:10px;text-align:center;white-space:nowrap;">
                                {{ $item->quantity }}
                            </td>

                            <td style="padding:10px;text-align:right;white-space:nowrap;">
                                {{ currency_symbol($order->user->currency) }}{{ number_format($item->rate,2) }}
                            </td>

                            <td style="padding:10px;text-align:right;white-space:nowrap;">
                                <b>{{ currency_symbol($order->user->currency) }}{{ number_format($item->total_amount,2) }}</b>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>

                </table>

            </div>

            <!-- TOTAL -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-top:15px;background:#f9fafb;border-radius:8px;padding:10px;">

                <tr>
                    <td align="right">
                        <b>
                            Total:
                           {{ currency_symbol($order->user->currency) }}{{ number_format($order->items->sum('total_amount'),2) }}
                        </b>
                    </td>
                </tr>

            </table>

            <p style="font-size:13px;color:#666;margin-top:20px;line-height:1.6;">
                If you have any questions regarding your order, feel free to contact our support team.
            </p>

        </td>
    </tr>

    <!-- FOOTER -->
    <tr>
        <td style="text-align:center;padding:20px;border-top:1px solid #e5e7eb;">

            <div style="font-size:13px;color:#666;">
                Thanks & Regards
            </div>

            <div style="font-weight:bold;margin-top:5px;">
                {{ $order->user->company ?? 'Your Company' }}
            </div>

        </td>
    </tr>

</table>

</td>
</tr>
</table>

</body>
</html>