<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrderShipment;
use Illuminate\Http\Request;

class PurchaseOrderShipmentController extends Controller
{
    public function store(Request $request)
    {
        $shipments = [];

        foreach ($request->shipments as $shipment) {

            $shipments[] = PurchaseOrderShipment::create($shipment);
        }

        return response()->json($shipments);
    }
    
}