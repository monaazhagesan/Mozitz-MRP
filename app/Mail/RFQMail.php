<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\CompanyDetail;

class RFQMail extends Mailable
{
    use Queueable, SerializesModels;

    public $rfq;
    public $vendor;
    public $viewUrl;

    public function __construct($rfq, $vendor)
    {
        $this->rfq = $rfq;
        $this->vendor = $vendor;

        // Link to track "VIEWED" status
        $this->viewUrl = url('/rfq/view/' . $rfq->id . '?vendor=' . $vendor->id);
    }

   public function build()
{
     $company = CompanyDetail::first(); 

    // Generate PDF
    $pdf = Pdf::loadView('rfq.pdf', [
        'rfq' => $this->rfq,
        'vendor' => $this->vendor,
        'company' => $company
    ]);

    $fileName = 'RFQ_' . $this->rfq->rfq_number . '.pdf';

    return $this->subject('New RFQ Request - ' . $this->rfq->rfq_number)
        ->view('emails.rfq-mail')
        ->with([
            'rfq' => $this->rfq,
            'vendor' => $this->vendor,
            'viewUrl' => $this->viewUrl,
             'company' => $company,
        ])
        ->attachData($pdf->output(), $fileName, [
            'mime' => 'application/pdf',
        ]);
}
}