angular.module('orderCloud')
    .service('QuoteToCsvService', QuoteToCsvService);

function QuoteToCsvService($sce, WeirService, $filter) {
    function ToCsvJson(Quote, LineItems, DeliveryAddress, Payments, Labels) {
        var payment = null;
        if (Payments && Payments.length) {
            payment = Payments[0];
        }
        var data = [
            [Labels.Status, Quote.xp.Status],
            [Labels.QuoteNumber, Quote.ID],
            [Labels.YourReference, (Quote.xp && Quote.xp.RefNum ? Quote.xp.RefNum : "")],
            [Labels.PONumber, (payment && payment.xp && payment.xp.PONumber ? payment.xp.PONumber : "")],
            ["", ""],
            [Labels.SerialNum, Labels.TagNum, Labels.PartNum, Labels.PartDesc, Labels.RecRepl, Labels.LeadTime, Labels.PricePer, Labels.Quantity]
        ];

        angular.forEach(LineItems, function (item) {
            var line = [];
            line.push((item.xp.SN) ? item.xp.SN : "");
            line.push((item.xp.TagNumber) ? item.xp.TagNumber : "");
            line.push((item.Product.Name) ? item.Product.Name : "");
            line.push((item.Product.Description) ? item.Product.Description : "");
            line.push((item.Product.xp.ReplacementSchedule) ? item.Product.xp.ReplacementSchedule : "");
            line.push((item.Product.xp.LeadTime) ? item.Product.xp.LeadTime : "");
            line.push(item.UnitPrice);
            line.push(item.Quantity);
            data.push(line);
        });
        data.push(["", "", "", "", "", Labels.Total, Quote.Total]);
        data.push(["", ""]);
        data.push([Labels.DeliveryAddress]);
        if (DeliveryAddress) {
            data.push([DeliveryAddress.FirstName + " " + DeliveryAddress.LastName, ""]);
            data.push([DeliveryAddress.CompanyName]);
            data.push([DeliveryAddress.Street1]);
            data.push([DeliveryAddress.Street2]);
            data.push([DeliveryAddress.City]);
        }
	    data.push(["", ""]);
        data.push([Labels.Comments]);
	    angular.forEach(Quote.xp.CommentsToWeir, function(comment) {
		    data.push(["",comment.by,$filter('weirdate')(comment.date)]);
		    data.push(["","",comment.val]);
	    });
        return data;
    }
    var service =
        {
            ToCsvJson: ToCsvJson
        };
    return service;
}
