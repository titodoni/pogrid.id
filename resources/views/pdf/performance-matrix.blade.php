<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>POgrid.id - Performance Matrix Report</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }
        .meta-info {
            float: right;
            text-align: right;
            font-size: 10px;
            color: #475569;
        }
        .clear {
            clear: both;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .kpi-container {
            margin-bottom: 20px;
        }
        .kpi-card {
            width: 23%;
            float: left;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            margin-right: 2%;
            background-color: #f8fafc;
            text-align: center;
        }
        .kpi-card.last {
            margin-right: 0;
        }
        .kpi-val {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
        }
        .kpi-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
        }
        th {
            background-color: #f1f5f9;
            font-weight: 700;
            font-size: 10px;
            color: #334155;
            text-transform: uppercase;
        }
        tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 9px;
            font-weight: 700;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-red {
            background-color: #fee2e2;
            color: #ef4444;
        }
        .badge-yellow {
            background-color: #fef3c7;
            color: #d97706;
        }
        .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
        }
        .sig-block {
            margin-top: 40px;
            float: right;
            width: 200px;
            text-align: center;
        }
        .sig-line {
            border-bottom: 1px solid #94a3b8;
            margin-top: 50px;
            margin-bottom: 4px;
        }
        .kpi-delta {
            font-size: 8px;
            font-weight: bold;
            margin-top: 2px;
        }
        .delta-up {
            color: #10b981;
        }
        .delta-down {
            color: #ef4444;
        }
        .narrative-box {
            background-color: #f0f7ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 20px;
        }
        .narrative-title {
            font-size: 9px;
            color: #0284c7;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .narrative-text {
            font-size: 11px;
            color: #334155;
            margin: 0;
            line-height: 1.5;
        }
        .finance-strip {
            margin-bottom: 20px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
        }
        .finance-col {
            width: 48%;
            float: left;
            text-align: center;
        }
        .finance-col.border-right {
            border-right: 1px solid #e2e8f0;
            margin-right: 2%;
        }
        .finance-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }
        .finance-val {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="meta-info">
            <strong>Company:</strong> {{ $tenant->company_name }}<br>
            <strong>Range:</strong> {{ strtoupper($range) }}<br>
            <strong>Date Generated:</strong> {{ $generated_at }}
        </div>
        <div class="logo">POgrid.id</div>
        <div class="subtitle">Operational Performance & Timelines Summary Report</div>
        <div class="clear"></div>
    </div>

    @php
        $prev = $telemetry['previous'] ?? [];
        $otdrDelta = null;
        if (isset($prev['otdr']) && $prev['otdr'] !== null) {
            $otdrDelta = round(($telemetry['otdr'] - $prev['otdr']), 1);
        }

        $topStuck = null;
        $maxStuck = 0;
        foreach ($telemetry['stage_metrics'] as $m) {
            if ($m['stuck_count'] > $maxStuck) {
                $maxStuck = $m['stuck_count'];
                $topStuck = $m;
            }
        }

        $narrative = "Periode ini, pabrik menyelesaikan {$telemetry['otdr']}% pesanan tepat waktu";
        if ($otdrDelta !== null) {
            $narrative .= $otdrDelta >= 0
                ? " — naik " . abs($otdrDelta) . "% dari periode lalu"
                : " — turun " . abs($otdrDelta) . "% dari periode lalu";
        }
        $narrative .= ". ";

        if ($topStuck) {
            $narrative .= "Bottleneck utama ada di tahap {$topStuck['stage']} ({$topStuck['stuck_count']} macet, rata-rata {$topStuck['avg_cycle_time']} hari/item). ";
        } else {
            $narrative .= "Semua tahap produksi berjalan normal. ";
        }

        $urgentActive = $telemetry['urgent_active'] ?? 0;
        if ($urgentActive > 0) {
            $narrative .= "Terdapat {$urgentActive} PO mendesak yang masih aktif. ";
        }

        $uninvoiced = $telemetry['finance_health']['uninvoiced_count'] ?? 0;
        if ($uninvoiced > 0) {
            $narrative .= "{$uninvoiced} item selesai belum difakturkan.";
        }
    @endphp

    <div class="narrative-box">
        <div class="narrative-title">Ringkasan Kinerja / Performance Summary</div>
        <p class="narrative-text">{{ $narrative }}</p>
    </div>

    <div class="section-title">Key Performance Indicators</div>
    <div class="kpi-container">
        <div class="kpi-card">
            <div class="kpi-label">On-Time Delivery Rate</div>
            <div class="kpi-val">{{ $telemetry['otdr'] }}%</div>
            @if($otdrDelta !== null)
                <div class="kpi-delta {{ $otdrDelta >= 0 ? 'delta-up' : 'delta-down' }}">
                    {{ $otdrDelta >= 0 ? '▲' : '▼' }} {{ abs($otdrDelta) }}% vs prev
                </div>
            @endif
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Manufacture Output</div>
            <div class="kpi-val">
                @php
                    $deliveredCurr = $telemetry['manufacture']['delivered'] ?? $telemetry['manufacture']['completed'] ?? 0;
                    $deliveredPrev = $prev['manufacture']['delivered'] ?? 0;
                    $deliveredDelta = $deliveredPrev > 0 ? round((($deliveredCurr - $deliveredPrev) / $deliveredPrev) * 100) : null;
                @endphp
                {{ $deliveredCurr }} / {{ $telemetry['manufacture']['target'] }} Pcs
            </div>
            @if($deliveredDelta !== null)
                <div class="kpi-delta {{ $deliveredDelta >= 0 ? 'delta-up' : 'delta-down' }}">
                    {{ $deliveredDelta >= 0 ? '▲' : '▼' }} {{ abs($deliveredDelta) }}% vs prev
                </div>
            @endif
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Active Risks</div>
            <div class="kpi-val">
                @php
                    $red = $telemetry['risks']['red'];
                    $yellow = $telemetry['risks']['yellow'];
                @endphp
                @if($red == 0 && $yellow == 0)
                    <span style="color: #10b981">All Healthy</span>
                @else
                    @php
                        $parts = [];
                        if ($red > 0) {
                            $parts[] = "<span style='color: #ef4444'>{$red} Stuck</span>";
                        }
                        if ($yellow > 0) {
                            $parts[] = "<span style='color: #f97316'>{$yellow} Rework</span>";
                        }
                        echo implode(' / ', $parts);
                    @endphp
                @endif
            </div>
            <div class="kpi-delta" style="color: #64748b;">
                {{ $telemetry['urgent_active'] ?? 0 }} urgent POs
            </div>
        </div>
        <div class="kpi-card last">
            <div class="kpi-label">Average Delay</div>
            <div class="kpi-val">{{ $telemetry['avg_delay_days'] }} Days</div>
            @php
                $delayDelta = null;
                if (isset($prev['avg_delay_days']) && $prev['avg_delay_days'] !== null) {
                    $delayDelta = round(($telemetry['avg_delay_days'] - $prev['avg_delay_days']), 1);
                }
            @endphp
            @if($delayDelta !== null)
                <div class="kpi-delta {{ $delayDelta <= 0 ? 'delta-up' : 'delta-down' }}">
                    {{ $delayDelta <= 0 ? '▼' : '▲' }} {{ abs($delayDelta) }}d vs prev
                </div>
            @endif
        </div>
        <div class="clear"></div>
    </div>

    @if(isset($telemetry['finance_health']))
        <div class="finance-strip">
            <div class="finance-col border-right">
                <div class="finance-label">Uninvoiced Items (Belum Difakturkan)</div>
                <div class="finance-val" style="color: {{ $telemetry['finance_health']['uninvoiced_count'] > 0 ? '#d97706' : '#10b981' }}">
                    {{ $telemetry['finance_health']['uninvoiced_count'] }}
                </div>
            </div>
            <div class="finance-col">
                <div class="finance-label">Unpaid Items (Belum Dibayar)</div>
                <div class="finance-val" style="color: {{ $telemetry['finance_health']['unpaid_count'] > 0 ? '#ea580c' : '#10b981' }}">
                    {{ $telemetry['finance_health']['unpaid_count'] }}
                </div>
            </div>
            <div class="clear"></div>
        </div>
    @endif

    <div class="section-title">Bottleneck Stage Analyzer</div>
    <table>
        <thead>
            <tr>
                <th>Production Stage</th>
                <th style="text-align: center;">Active Items</th>
                <th style="text-align: center;">Stuck Alerts (Red)</th>
                <th style="text-align: center;">Rework Alerts (Yellow)</th>
                <th style="text-align: right;">Avg. Cycle Time (Days)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($telemetry['stage_metrics'] as $metric)
                <tr>
                    <td style="font-weight: bold;">{{ strtoupper($metric['stage']) }}</td>
                    <td style="text-align: center;">{{ $metric['active_items'] }}</td>
                    <td style="text-align: center;">
                        @if($metric['stuck_count'] > 0)
                            <span class="badge badge-red">{{ $metric['stuck_count'] }} stuck</span>
                        @else
                            0
                        @endif
                    </td>
                    <td style="text-align: center;">
                        @if($metric['rework_count'] > 0)
                            <span class="badge badge-yellow">{{ $metric['rework_count'] }} rework</span>
                        @else
                            0
                        @endif
                    </td>
                    <td style="text-align: right; font-weight: bold;">{{ number_format($metric['avg_cycle_time'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">Client Performance Board (Papan Kinerja Klien)</div>
    <table>
        <thead>
            <tr>
                <th>Client Name</th>
                <th style="text-align: center; width: 80px;">Active POs</th>
                <th style="text-align: center; width: 100px;">On-Time Rate</th>
                <th style="text-align: center; width: 100px;">Overdue Items</th>
                <th style="text-align: center; width: 100px;">Uninvoiced</th>
                <th style="text-align: center; width: 100px;">Unpaid</th>
            </tr>
        </thead>
        <tbody>
            @if(empty($telemetry['client_health']))
                <tr>
                    <td colspan="6" style="text-align: center; color: #64748b;">No client data available.</td>
                </tr>
            @else
                @foreach($telemetry['client_health'] as $client)
                    @php
                        $hasRisk = $client['overdue_items'] > 0 || $client['uninvoiced_count'] > 0 || $client['unpaid_count'] > 0;
                        $otdrVal = $client['on_time_rate'];
                        $otdrColor = '#64748b';
                        if ($otdrVal !== null) {
                            $otdrColor = $otdrVal >= 80 ? '#10b981' : ($otdrVal >= 60 ? '#d97706' : '#ef4444');
                        }
                    @endphp
                    <tr style="{{ $hasRisk ? 'background-color: #fffafb;' : '' }}">
                        <td style="font-weight: bold;">{{ $client['client_name'] }}</td>
                        <td style="text-align: center;">{{ $client['active_pos'] }}</td>
                        <td style="text-align: center; font-weight: bold; color: {{ $otdrColor }}">
                            {{ $otdrVal !== null ? $otdrVal . '%' : 'N/A' }}
                        </td>
                        <td style="text-align: center;">
                            @if($client['overdue_items'] > 0)
                                <span class="badge badge-red">{{ $client['overdue_items'] }}</span>
                            @else
                                <span style="color: #10b981; font-weight: bold;">✓</span>
                            @endif
                        </td>
                        <td style="text-align: center;">
                            @if($client['uninvoiced_count'] > 0)
                                <span class="badge badge-yellow">{{ $client['uninvoiced_count'] }}</span>
                            @else
                                <span style="color: #10b981; font-weight: bold;">✓</span>
                            @endif
                        </td>
                        <td style="text-align: center;">
                            @if($client['unpaid_count'] > 0)
                                <span class="badge badge-yellow" style="background-color: #ffedd5; color: #ea580c;">{{ $client['unpaid_count'] }}</span>
                            @else
                                <span style="color: #10b981; font-weight: bold;">✓</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            @endif
        </tbody>
    </table>

    <div class="section-title">Delay Reasons Breakdown</div>
    <table>
        <thead>
            <tr>
                <th>Reported Failure Reason / Category</th>
                <th style="text-align: center; width: 150px;">Incident Count</th>
            </tr>
        </thead>
        <tbody>
            @foreach($telemetry['delay_reasons'] as $reason => $count)
                <tr>
                    <td>{{ $reason }}</td>
                    <td style="text-align: center; font-weight: bold;">{{ $count }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">Active Delay & Risk Directory</div>
    <table>
        <thead>
            <tr>
                <th style="width: 100px;">PO Number</th>
                <th>Client</th>
                <th>Item</th>
                <th style="text-align: center; width: 60px;">Progress</th>
                <th style="text-align: center; width: 90px;">Deadline</th>
                <th style="text-align: center; width: 70px;">Overdue</th>
                <th>Stuck / Delay Reason</th>
            </tr>
        </thead>
        <tbody>
            @if(empty($telemetry['delayed_items']))
                <tr>
                    <td colspan="7" style="text-align: center; color: #64748b;">No active delays or overdue items.</td>
                </tr>
            @else
                @foreach($telemetry['delayed_items'] as $item)
                    <tr>
                        <td style="font-weight: bold;">{{ $item['po_number'] }}</td>
                        <td>{{ $item['client_name'] }}</td>
                        <td>{{ $item['item_name'] }}</td>
                        <td style="text-align: center;"><span class="badge" style="background-color: #e0f2fe; color: #0369a1;">{{ number_format($item['progress_percent'], 0) }}%</span></td>
                        <td style="text-align: center;">{{ $item['global_deadline'] }}</td>
                        <td style="text-align: center;">
                            @if($item['days_overdue'] > 0)
                                <span class="badge badge-red">{{ $item['days_overdue'] }} days</span>
                            @else
                                -
                            @endif
                        </td>
                        <td style="color: #ef4444; font-style: italic;">{{ $item['reason'] }}</td>
                    </tr>
                @endforeach
            @endif
        </tbody>
    </table>

    <div class="sig-block">
        <div class="sig-line"></div>
        <span style="font-size: 10px; color: #64748b;">Factory Operations Manager</span>
    </div>
    <div class="clear"></div>

    <div class="footer">
        This document contains confidential production analytics generated automatically by POgrid.id.<br>
        &copy; 2026 POgrid.id. All rights reserved.
    </div>

</body>
</html>
