<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
    body {
        margin:0;
        padding:0;
        background:#f4f6fb;
        font-family: Arial, sans-serif;
    }

    @media only screen and (max-width:600px) {
        .container { width:100% !important; }
        .padding { padding:16px !important; }
        .title { font-size:18px !important; }
    }
</style>
</head>

<body>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;">
<tr>
<td align="center">

<!-- MAIN CONTAINER -->
<table width="760" cellpadding="0" cellspacing="0" border="0"
       style="max-width:760px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

    <!-- HEADER -->
    <tr>
        <td style="background:linear-gradient(135deg,#4f46e5,#2563eb);padding:28px;text-align:center;color:#fff;">

            <div class="title" style="font-size:24px;font-weight:bold;">
                Package Delivered 📦
            </div>

            <div style="font-size:13px;margin-top:6px;opacity:0.9;">
                Your order has been successfully delivered
            </div>

            <div style="display:inline-block;margin-top:10px;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:999px;font-size:12px;">
                Delivered
            </div>

        </td>
    </tr>

    <!-- CONTENT -->
    <tr>
        <td class="padding" style="padding:26px;">

            <!-- STACKED INFO (GRID REPLACED) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr><td style="padding:10px;">
                    <div style="background:#f9fafb;padding:12px;border:1px solid #eee;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;">Order Number</div>
                        <div style="font-weight:600;">{{ $package->order_number }}</div>
                    </div>
                </td></tr>

                <tr><td style="padding:10px;">
                    <div style="background:#f9fafb;padding:12px;border:1px solid #eee;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;">Package Slip</div>
                        <div style="font-weight:600;">{{ $package->package_slip }}</div>
                    </div>
                </td></tr>

                <tr><td style="padding:10px;">
                    <div style="background:#f9fafb;padding:12px;border:1px solid #eee;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;">Carrier</div>
                        <div style="font-weight:600;">{{ $package->carrier }}</div>
                    </div>
                </td></tr>

                <tr><td style="padding:10px;">
                    <div style="background:#f9fafb;padding:12px;border:1px solid #eee;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;">Tracking Number</div>
                        <div style="font-weight:600;">{{ $package->tracking_number }}</div>
                    </div>
                </td></tr>

                <tr><td style="padding:10px;">
                    <div style="background:#f9fafb;padding:12px;border:1px solid #eee;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;">Shipping Date</div>
                        <div style="font-weight:600;">{{ $package->date }}</div>
                    </div>
                </td></tr>

                <tr><td style="padding:10px;">
                    <div style="background:#f9fafb;padding:12px;border:1px solid #eee;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;">Status</div>
                        <div style="font-weight:600;">{{ ucfirst($package->status) }}</div>
                    </div>
                </td></tr>

            </table>

            <!-- SECTION TITLE -->
            <div style="margin:20px 0 10px;font-size:15px;font-weight:bold;border-left:4px solid #4f46e5;padding-left:10px;">
                Delivered Items
            </div>

            <!-- ITEMS TABLE (EMAIL SAFE) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e5e7eb;font-size:13px;">

                <thead>
                    <tr style="background:#111827;color:#fff;">
                        <th style="padding:10px;">#</th>
                        <th style="padding:10px;text-align:left;">Item Code</th>
                        <th style="padding:10px;text-align:left;">Item Name</th>
                        <th style="padding:10px;">UOM</th>
                        <th style="padding:10px;">Delivered Qty</th>
                    </tr>
                </thead>

                <tbody>
                    @php
                        $items = json_decode($package->items, true) ?? [];
                        $total = 0;
                    @endphp

                    @foreach($items as $index => $item)
                        @php
                            $qty = $item['packed_quantity'] ?? 0;
                            $total += $qty;
                        @endphp

                        <tr style="border-top:1px solid #eee;">
                            <td style="padding:10px;text-align:center;">{{ $index + 1 }}</td>
                            <td style="padding:10px;">{{ $item['item_code'] ?? '-' }}</td>
                            <td style="padding:10px;">{{ $item['item_name'] ?? '-' }}</td>
                            <td style="padding:10px;text-align:center;">{{ $item['uom'] ?? 'Nos' }}</td>
                            <td style="padding:10px;text-align:center;font-weight:bold;">{{ $qty }}</td>
                        </tr>

                    @endforeach
                </tbody>

                <tfoot>
                    <tr style="background:#f3f4f6;">
                        <td colspan="4" style="padding:10px;text-align:right;font-weight:bold;">
                            TOTAL
                        </td>
                        <td style="padding:10px;text-align:center;font-weight:bold;">
                            {{ $total }}
                        </td>
                    </tr>
                </tfoot>

            </table>

        </td>
    </tr>

    <!-- FOOTER -->
    <tr>
        <td style="text-align:center;padding:18px;border-top:1px solid #eee;font-size:12px;color:#9ca3af;">
            © {{ date('Y') }} {{ $company?->company ?? 'N/A' }}. All rights reserved.
        </td>
    </tr>

</table>

</td>
</tr>
</table>

</body>
</html>