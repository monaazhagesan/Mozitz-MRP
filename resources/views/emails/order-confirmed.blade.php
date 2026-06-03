<div style="font-family: Arial, sans-serif; background:#f6f8fb; padding:20px;">

  <div style="max-width:650px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #eaeaea;">

    <!-- Header -->
    <div style="background:#1a73e8; padding:20px; text-align:center; color:#fff;">
      <h2 style="margin:0; font-size:22px;">Order Confirmed 🎉</h2>
      <p style="margin:5px 0 0; font-size:14px;">Thank you for your purchase</p>
    </div>

    <!-- Body -->
    <div style="padding:20px; color:#333; font-size:14px; line-height:1.6;">

      <p style="margin-top:0;">
        Dear <strong>{{ $order->customer }}</strong>,
      </p>

      <p>
        Your order has been successfully <strong>confirmed</strong>. Below is your order summary.
      </p>

      <!-- Order Info -->
      <h3 style="border-bottom:1px solid #eee; padding-bottom:6px;">📦 Order Summary</h3>

      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="background:#f9fafc; font-weight:bold; width:40%;">Order Number</td>
          <td>{{ $order->order_no }}</td>
        </tr>
        <tr>
          <td style="background:#f9fafc; font-weight:bold;">Order Date</td>
          <td>{{ $order->order_date ?? now()->toDateString() }}</td>
        </tr>
        <tr>
          <td style="background:#f9fafc; font-weight:bold;">Status</td>
          <td><span style="color:green; font-weight:bold;">{{ $order->status }}</span></td>
        </tr>
        <tr>
          <td style="background:#f9fafc; font-weight:bold;">Order Type</td>
          <td>{{ $order->order_type ?? 'Standard' }}</td>
        </tr>
        <tr>
          <td style="background:#f9fafc; font-weight:bold;">Expected Delivery</td>
          <td>{{ $order->expected_delivery_date ?? '-' }}</td>
        </tr>
        <tr>
          <td style="background:#f9fafc; font-weight:bold;">Shipping Address</td>
          <td>{{ $order->shipping_address ?? '-' }}</td>
        </tr>
      </table>

      <!-- Contact -->
      <h3 style="margin-top:25px; border-bottom:1px solid #eee; padding-bottom:6px;">📍 Contact Information</h3>

      <p>
        <strong>Contact Person:</strong> {{ $order->contact_person ?? '-' }}<br>
        <strong>Phone:</strong> {{ $order->contact_number ?? '-' }}<br>
        <strong>Email:</strong> {{ $order->email ?? '-' }}
      </p>

      <!-- Items -->
      <h3 style="margin-top:25px; border-bottom:1px solid #eee; padding-bottom:6px;">🧾 Items Ordered</h3>

      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; font-size:13px;">
        <tr style="background:#1a73e8; color:#fff;">
          <th align="left">Item Code</th>
          <th align="left">Item Name</th>
          <th align="center">Qty</th>
          <th align="right">Rate</th>
          <th align="right">Total</th>
        </tr>

        @foreach($order->items as $item)
        <tr style="border-bottom:1px solid #eee;">
          <td>{{ $item->item_code }}</td>
          <td>{{ $item->item_name }}</td>
          <td align="center">{{ $item->quantity }}</td>
          <td align="right">₹{{ number_format($item->rate, 2) }}</td>
          <td align="right">₹{{ number_format($item->total_amount, 2) }}</td>
        </tr>
        @endforeach
      </table>

      <!-- Total -->
      <div style="text-align:right; margin-top:15px; font-size:16px;">
        <strong>Total: ₹{{ number_format($order->items->sum('total_amount'), 2) }}</strong>
      </div>

      <hr style="margin:20px 0; border:none; border-top:1px solid #eee;">

      <p style="font-size:13px; color:#555;">
        If you have any questions regarding your order, feel free to contact our support team.
      </p>

      <p style="margin-bottom:0;">
        Thanks & Regards,<br>
        <strong>{{ $order->user->company ?? 'Your Company Name' }}</strong>
      </p>

    </div>
  </div>

</div>