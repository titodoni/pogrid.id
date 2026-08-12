<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;

class ExportService
{
    public function exportPdf($tenant, $telemetry, $range)
    {
        $pdf = Pdf::loadView('pdf.performance-matrix', [
            'tenant' => $tenant,
            'telemetry' => $telemetry,
            'range' => $range,
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return $pdf->download("performance-matrix-{$range}.pdf");
    }

    public function exportCsv($telemetry, $range)
    {
        $filename = "performance-matrix-{$range}-".now()->format('Ymd').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($telemetry) {
            $handle = fopen('php://output', 'w');

            // BOM for Excel UTF-8
            fwrite($handle, "\xEF\xBB\xBF");

            // ── Summary Section ──
            fputcsv($handle, ['KPI Summary', '', '']);
            fputcsv($handle, ['OTDR (%)', $telemetry['otdr'] ?? 'N/A', '']);
            fputcsv($handle, ['Manufacture Delivered', $telemetry['manufacture']['delivered'], 'Target: '.$telemetry['manufacture']['target']]);
            fputcsv($handle, ['Buyout Completed', $telemetry['buyout']['completed'], 'Target: '.$telemetry['buyout']['target']]);
            fputcsv($handle, ['Service Completed', $telemetry['service']['completed'], 'Target: '.$telemetry['service']['target']]);
            fputcsv($handle, ['Active Risks (Red)', $telemetry['risks']['red'], '']);
            fputcsv($handle, ['Active Risks (Yellow)', $telemetry['risks']['yellow'], '']);
            fputcsv($handle, ['Avg Delay (Days)', $telemetry['avg_delay_days'], '']);
            fputcsv($handle, ['Urgent Active POs', $telemetry['urgent_active'], '']);
            fputcsv($handle, ['Uninvoiced Items', $telemetry['finance_health']['uninvoiced_count'], '']);
            fputcsv($handle, ['Unpaid Items', $telemetry['finance_health']['unpaid_count'], '']);
            fputcsv($handle, ['', '', '']);

            // ── All Items Directory ──
            fputcsv($handle, ['All Items Directory', '', '', '', '', '', '', '', '', '', '', '']);
            $itemHeaders = [
                'PO Number', 'Client', 'Item Name', 'Status', 'PO Status', 'Progress (%)',
                'Deadline', 'Days Overdue', 'Current Stage', 'Reason',
                'Target Qty', 'Delivered Qty', 'Invoice Status', 'Payment Status',
                'On Time', 'Urgent',
            ];
            fputcsv($handle, $itemHeaders);

            foreach ($telemetry['all_items'] as $item) {
                fputcsv($handle, [
                    $item['po_number'],
                    $item['client_name'],
                    $item['item_name'],
                    $item['status'],
                    $item['po_status'],
                    $item['progress_percent'],
                    $item['global_deadline'],
                    $item['days_overdue'],
                    $item['current_stage'] ?? '',
                    $item['reason'] ?? '',
                    $item['target_qty'],
                    $item['delivered_qty'],
                    $item['invoice_status'],
                    $item['payment_status'],
                    $item['is_on_time'] ? 'Yes' : 'No',
                    $item['is_urgent'] ? 'Yes' : 'No',
                ]);
            }

            fputcsv($handle, ['', '', '']);

            // ── Client Health ──
            fputcsv($handle, ['Client Health', '', '', '', '', '', '', '']);
            $clientHeaders = [
                'Client', 'Active POs', 'Completed Total', 'On-Time Rate (%)',
                'Overdue Items', 'Uninvoiced', 'Unpaid', 'Risk Score',
            ];
            fputcsv($handle, $clientHeaders);

            foreach ($telemetry['client_health'] as $client) {
                fputcsv($handle, [
                    $client['client_name'],
                    $client['active_pos'],
                    $client['completed_total'],
                    $client['on_time_rate'] ?? 'N/A',
                    $client['overdue_items'],
                    $client['uninvoiced_count'],
                    $client['unpaid_count'],
                    $client['risk_score'],
                ]);
            }

            fputcsv($handle, ['', '', '']);

            // ── Stage Metrics ──
            fputcsv($handle, ['Stage Metrics (Bottleneck Analysis)', '', '', '', '']);
            $stageHeaders = ['Stage', 'Active Items', 'Stuck Count', 'Rework Count', 'Avg Cycle Time (Days)'];
            fputcsv($handle, $stageHeaders);

            foreach ($telemetry['stage_metrics'] as $stage) {
                fputcsv($handle, [
                    $stage['stage'],
                    $stage['active_items'],
                    $stage['stuck_count'],
                    $stage['rework_count'],
                    $stage['avg_cycle_time'],
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportXlsx($telemetry, $range)
    {
        $filename = "performance-matrix-{$range}-".now()->format('Ymd').'.xlsx';

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($telemetry) {
            $writer = new Writer;
            $writer->openToFile('php://output');

            $boldStyle = (new Style)
                ->withFontBold(true);

            // ── Sheet 1: KPI Summary ──
            $sheet1 = $writer->getCurrentSheet();
            $sheet1->setName('KPI Summary');

            $writer->addRow(Row::fromValuesWithStyle(['Metric', 'Value', 'Note'], $boldStyle));
            $writer->addRow(Row::fromValues(['OTDR (%)', $telemetry['otdr'] ?? 'N/A', '']));
            $writer->addRow(Row::fromValues(['Manufacture Delivered', $telemetry['manufacture']['delivered'], 'Target: '.$telemetry['manufacture']['target']]));
            $writer->addRow(Row::fromValues(['Buyout Completed', $telemetry['buyout']['completed'], 'Target: '.$telemetry['buyout']['target']]));
            $writer->addRow(Row::fromValues(['Service Completed', $telemetry['service']['completed'], 'Target: '.$telemetry['service']['target']]));
            $writer->addRow(Row::fromValues(['Active Risks (Red)', $telemetry['risks']['red'], '']));
            $writer->addRow(Row::fromValues(['Active Risks (Yellow)', $telemetry['risks']['yellow'], '']));
            $writer->addRow(Row::fromValues(['Avg Delay (Days)', $telemetry['avg_delay_days'], '']));
            $writer->addRow(Row::fromValues(['Urgent Active POs', $telemetry['urgent_active'], '']));
            $writer->addRow(Row::fromValues(['Uninvoiced Items', $telemetry['finance_health']['uninvoiced_count'], '']));
            $writer->addRow(Row::fromValues(['Unpaid Items', $telemetry['finance_health']['unpaid_count'], '']));

            // ── Sheet 2: All Items Directory ──
            $writer->addNewSheetAndMakeItCurrent();
            $sheet2 = $writer->getCurrentSheet();
            $sheet2->setName('All Items');

            $writer->addRow(Row::fromValuesWithStyle([
                'PO Number', 'Client', 'Item Name', 'Status', 'PO Status', 'Progress (%)',
                'Deadline', 'Days Overdue', 'Current Stage', 'Reason',
                'Target Qty', 'Delivered Qty', 'Invoice Status', 'Payment Status',
                'On Time', 'Urgent',
            ], $boldStyle));

            foreach ($telemetry['all_items'] as $item) {
                $writer->addRow(Row::fromValues([
                    $item['po_number'],
                    $item['client_name'],
                    $item['item_name'],
                    $item['status'],
                    $item['po_status'],
                    $item['progress_percent'],
                    $item['global_deadline'],
                    $item['days_overdue'],
                    $item['current_stage'] ?? '',
                    $item['reason'] ?? '',
                    $item['target_qty'],
                    $item['delivered_qty'],
                    $item['invoice_status'],
                    $item['payment_status'],
                    $item['is_on_time'] ? 'Yes' : 'No',
                    $item['is_urgent'] ? 'Yes' : 'No',
                ]));
            }

            // ── Sheet 3: Client Health ──
            $writer->addNewSheetAndMakeItCurrent();
            $sheet3 = $writer->getCurrentSheet();
            $sheet3->setName('Client Health');

            $writer->addRow(Row::fromValuesWithStyle([
                'Client', 'Active POs', 'Completed Total', 'On-Time Rate (%)',
                'Overdue Items', 'Uninvoiced', 'Unpaid', 'Risk Score',
            ], $boldStyle));

            foreach ($telemetry['client_health'] as $client) {
                $writer->addRow(Row::fromValues([
                    $client['client_name'],
                    $client['active_pos'],
                    $client['completed_total'],
                    $client['on_time_rate'] ?? 'N/A',
                    $client['overdue_items'],
                    $client['uninvoiced_count'],
                    $client['unpaid_count'],
                    $client['risk_score'],
                ]));
            }

            // ── Sheet 4: Stage Metrics ──
            $writer->addNewSheetAndMakeItCurrent();
            $sheet4 = $writer->getCurrentSheet();
            $sheet4->setName('Stage Metrics');

            $writer->addRow(Row::fromValuesWithStyle([
                'Stage', 'Active Items', 'Stuck Count', 'Rework Count', 'Avg Cycle Time (Days)',
            ], $boldStyle));

            foreach ($telemetry['stage_metrics'] as $stage) {
                $writer->addRow(Row::fromValues([
                    $stage['stage'],
                    $stage['active_items'],
                    $stage['stuck_count'],
                    $stage['rework_count'],
                    $stage['avg_cycle_time'],
                ]));
            }

            $writer->close();
        };

        return response()->stream($callback, 200, $headers);
    }
}
