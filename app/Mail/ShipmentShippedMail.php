<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\User;


class ShipmentShippedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $package;

    public function __construct($package)
    {
        $this->package = $package;
    }

    public function build()
    {
        $company = User::find($this->package->user_id);

        return $this->subject('Your Order Package Has Been Shipped')
        ->view('emails.shipment_shipped')
        ->with([
            'package' => $this->package,
            'company' => $company,
        ]);
    }
}