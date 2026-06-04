<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\OrderPackage;
use App\Models\User;

class ShipmentDeliveredMail extends Mailable
{
    use Queueable, SerializesModels;

    public $package;

    /**
     * Create a new message instance.
     */
    public function __construct(OrderPackage $package)
    {
        $this->package = $package;
    }

    /**
     * Build the message.
     */
    public function build()
    {
         $company = User::find($this->package->user_id);

        return $this->subject('Your Order Package Has Been Delivered 🎉')
            ->view('emails.shipment-delivered')
            ->with([
            'package' => $this->package,
            'company' => $company,
        ]);
    }
}