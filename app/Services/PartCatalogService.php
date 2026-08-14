<?php

namespace App\Services;

use App\Models\Item;

/**
 * Tenant-scoped query service for part memory and repeat order autocomplete.
 */
class PartCatalogService
{
    /**
     * Get recent distinct items previously ordered by a specific client for this tenant.
     *
     * @return array<int, array{item_name: string, item_type: string, target_qty: int, required_stages: array<string>, vendor_name: ?string, vendor_phone: ?string}>
     */
    public function getRecentItemsForClient(string $clientName, int $limit = 10): array
    {
        if (trim($clientName) === '') {
            return [];
        }

        $items = Item::where('tenant_id', TenantManager::getTenantId())
            ->whereHas('po', fn ($q) => $q->where('client_name', $clientName))
            ->whereNotIn('status', ['CANCELLED', 'TERMINATED'])
            ->latest('id')
            ->get();

        $unique = [];
        $results = [];

        foreach ($items as $item) {
            $key = strtolower(trim($item->item_name));
            if (! isset($unique[$key])) {
                $unique[$key] = true;
                $results[] = [
                    'item_name' => $item->item_name,
                    'item_type' => $item->item_type,
                    'target_qty' => (int) $item->target_qty,
                    'required_stages' => is_array($item->required_stages) ? $item->required_stages : [],
                    'vendor_name' => $item->vendor_name,
                    'vendor_phone' => $item->vendor_phone,
                ];

                if (count($results) >= $limit) {
                    break;
                }
            }
        }

        return $results;
    }

    /**
     * Autocomplete search for historical items matching a query for a client.
     *
     * @return array<int, array{item_name: string, item_type: string, required_stages: array<string>}>
     */
    public function searchClientItems(string $clientName, string $query, int $limit = 5): array
    {
        if (trim($clientName) === '' || trim($query) === '') {
            return [];
        }

        $items = Item::where('tenant_id', TenantManager::getTenantId())
            ->whereHas('po', fn ($q) => $q->where('client_name', $clientName))
            ->where('item_name', 'like', "%{$query}%")
            ->whereNotIn('status', ['CANCELLED', 'TERMINATED'])
            ->latest('id')
            ->get();

        $unique = [];
        $results = [];

        foreach ($items as $item) {
            $key = strtolower(trim($item->item_name));
            if (! isset($unique[$key])) {
                $unique[$key] = true;
                $results[] = [
                    'item_name' => $item->item_name,
                    'item_type' => $item->item_type,
                    'required_stages' => is_array($item->required_stages) ? $item->required_stages : [],
                ];

                if (count($results) >= $limit) {
                    break;
                }
            }
        }

        return $results;
    }
}
