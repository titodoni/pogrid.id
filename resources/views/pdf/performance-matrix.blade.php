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

    <div class="section-title">Key Performance Indicators</div>
    <div class="kpi-container">
        <div class="kpi-card">
            <div class="kpi-label">On-Time Delivery Rate</div>
            <div class="kpi-val">{{ $telemetry['otdr'] }}%</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Manufacture Output</div>
            <div class="kpi-val">{{ $telemetry['manufacture']['completed'] }} / {{ $telemetry['manufacture']['target'] }} Pcs</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Active Warnings</div>
            <div class="kpi-val">
                <span style="color: #ef4444">{{ $telemetry['risks']['red'] }} RED</span> / 
                <span style="color: #d97706">{{ $telemetry['risks']['yellow'] }} YEL</span>
            </div>
        </div>
        <div class="kpi-card last">
            <div class="kpi-label">Average Delay</div>
            <div class="kpi-val">{{ $telemetry['avg_delay_days'] }} Days</div>
        </div>
        <div class="clear"></div>
    </div>

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
