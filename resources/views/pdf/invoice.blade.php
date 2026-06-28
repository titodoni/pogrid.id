<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 30px;
            font-size: 14px;
            line-height: 1.5;
        }
        .invoice-box {
            max-width: 800px;
            margin: auto;
        }
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header table {
            width: 100%;
            border-collapse: collapse;
        }
        .logo {
            font-size: 26px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: -0.02em;
        }
        .title {
            text-align: right;
            font-size: 22px;
            font-weight: 700;
            color: #2563eb;
            text-transform: uppercase;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .label {
            color: #64748b;
            font-weight: 600;
            width: 120px;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .badge-unpaid {
            background-color: #fef2f2;
            color: #ef4444;
            border: 1px solid #fee2e2;
        }
        .badge-paid {
            background-color: #f0fdf4;
            color: #10b981;
            border: 1px solid #dcfce7;
        }
        .badge-sunk-cost {
            background-color: #fffbeb;
            color: #d97706;
            border: 1px solid #fef3c7;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        .details-table th {
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 12px;
        }
        .details-table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .text-right {
            text-align: right;
        }
        .total-box {
            float: right;
            width: 250px;
            margin-top: 20px;
        }
        .total-box table {
            width: 100%;
            border-collapse: collapse;
        }
        .total-box td {
            padding: 6px 0;
        }
        .total-row {
            font-size: 16px;
            font-weight: 700;
            border-top: 2px solid #2563eb;
            color: #1e3a8a;
        }
        .notes {
            margin-top: 60px;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
        }
        .clear {
            clear: both;
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <table>
                <tr>
                    <td>
                        <span class="logo">POgrid.id</span><br>
                        <span style="font-size: 12px; color: #64748b;">Progress & Delivery Tracking Platform</span>
                    </td>
                    <td class="title">
                        Invoice
                    </td>
                </tr>
            </table>
        </div>

        <table class="meta-table">
            <tr>
                <td style="width: 50%;">
                    <table>
                        <tr>
                            <td class="label">Invoice No:</td>
                            <td><strong>{{ $invoice->invoice_number }}</strong></td>
                        </tr>
                        <tr>
                            <td class="label">Date:</td>
                            <td>{{ $invoice->created_at->format('d M Y') }}</td>
                        </tr>
                        <tr>
                            <td class="label">Due Date:</td>
                            <td>{{ $invoice->due_date->format('d M Y') }}</td>
                        </tr>
                        <tr>
                            <td class="label">Status:</td>
                            <td>
                                @if($invoice->status === 'PAID')
                                    <span class="badge badge-paid">PAID</span>
                                @else
                                    <span class="badge badge-unpaid">UNPAID</span>
                                @endif
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%;">
                    <table>
                        <tr>
                            <td class="label">Type:</td>
                            <td>
                                @if($invoice->invoice_type === 'SUNK_COST')
                                    <span class="badge badge-sunk-cost">SUNK COST RECOVERY</span>
                                @else
                                    <span class="badge" style="background-color: #eff6ff; color: #2563eb; border: 1px solid #dbeafe;">STANDARD</span>
                                @endif
                            </td>
                        </tr>
                        @if($invoice->deliveryOrder)
                            <tr>
                                <td class="label">PO Number:</td>
                                <td>{{ $invoice->deliveryOrder->po->po_number }}</td>
                            </tr>
                            <tr>
                                <td class="label">Client:</td>
                                <td>{{ $invoice->deliveryOrder->po->client_name }}</td>
                            </tr>
                            <tr>
                                <td class="label">DO Number:</td>
                                <td>{{ $invoice->deliveryOrder->do_number }}</td>
                            </tr>
                        @endif
                    </table>
                </td>
            </tr>
        </table>

        <h3>Invoice Items</h3>
        <table class="details-table">
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>Type</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Rate</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @if($invoice->invoice_type === 'SUNK_COST')
                    <tr>
                        <td>
                            <strong>Sunk Cost Recovery (Midway Production Halted)</strong><br>
                            <span style="font-size: 12px; color: #64748b;">
                                Compensation for completed segments and material loss.
                            </span>
                        </td>
                        <td>SUNK_COST</td>
                        <td class="text-right">1</td>
                        <td class="text-right">IDR {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
                        <td class="text-right">IDR {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
                    </tr>
                @elseif($invoice->deliveryOrder)
                    @foreach($invoice->deliveryOrder->doItems as $doItem)
                        <tr>
                            <td>
                                <strong>{{ $doItem->item->item_name }}</strong><br>
                                <span style="font-size: 12px; color: #64748b;">
                                    PO: {{ $invoice->deliveryOrder->po->po_number }}
                                </span>
                            </td>
                            <td>{{ $doItem->item->item_type }}</td>
                            <td class="text-right">{{ $doItem->delivered_qty }}</td>
                            <td class="text-right">IDR 150.000</td>
                            <td class="text-right">IDR {{ number_format($doItem->delivered_qty * 150000, 0, ',', '.') }}</td>
                        </tr>
                    @endforeach
                @else
                    <tr>
                        <td colspan="5">No delivery item details found.</td>
                    </tr>
                @endif
            </tbody>
        </table>

        <div class="total-box">
            <table>
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td class="text-right">IDR {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td><strong>VAT (0%):</strong></td>
                    <td class="text-right">IDR 0</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total Amount:</strong></td>
                    <td class="text-right">IDR {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
                </tr>
            </table>
        </div>
        <div class="clear"></div>

        <div class="notes">
            <strong>Payment Terms & Notes:</strong>
            <p style="margin: 5px 0 0 0;">
                Please settle payment within 7 days of the invoice date. All payments should be transferred to our designated bank account. For inquiries, contact finance@pogrid.id.
            </p>
        </div>
    </div>
</body>
</html>
