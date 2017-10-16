angular.module( 'orderCloud' )
    .factory('Navigation', NavigationService)
;

function NavigationService($state, WeirService) {
    var service = {
        GoTo: OrderAction
    };

    function OrderAction(status) {
        // use the status to determine the action
        var action = {
            "SV":"quotes.saved"
        };
        var filter = {
            "orders.submitted": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.SubmittedWithPO.id,
                "xp.Active": true
            },
            "orders.pending": {
                "xp.Type": "Order",
                "xp.PendingPO": true,
                "xp.Active": true
            },
            "orders.revised": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.RevisedOrder.id+"|"+WeirService.OrderStatus.RejectedRevisedOrder.id,
                "xp.Active": true
            },
            "orders.confirmed": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.ConfirmedOrder.id,
                "xp.Active": true
            },
            "orders.despatched": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.Despatched.id,
                "xp.Active": true
            },
            "quotes.saved": {
                "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.Saved.id+"|"+WeirService.OrderStatus.Draft.id,
                "xp.Active":true
            },
            "quotes.enquiry" : {
                "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.Enquiry.id+"|"+WeirService.OrderStatus.EnquiryReview.id,
                "xp.Active":true
            },
            "quotes.inreview": {
                "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.Submitted.id+"|"+WeirService.OrderStatus.Review.id,
                "xp.Active":true
            },
            "quotes.revised": {
                "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.RevisedQuote.id+"|"+WeirService.OrderStatus.RejectedQuote.id,
                "xp.Active":true
            },
            "quotes.confirmed": {
                "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.ConfirmedQuote.id,
                "xp.Active":true
            }
        };
        $state.go(action, {filters: JSON.stringify(filter[action])}, {reload: true});
    }

    return service;
}