angular.module('orderCloud')
	.service('QuoteToCsvService', QuoteToCsvService);

function QuoteToCsvService($filter, $sce, OCGeography, Underscore, WeirService, $cookies) {
	function country (c) {
		var result = Underscore.findWhere(OCGeography.Countries, { value: c });
		return result ? result.label : '';
	}

	function ToCsvJson(Quote, LineItems, DeliveryAddress, Payments, Labels) {
		var payment = null;
		if (Payments && Payments.length) {
			payment = Payments[0];
		}
		angular.forEach(Labels, function(value, key) {
			var result =  $sce.getTrustedHtml(value);
			if (result !== "[object Object]") {
				result = result.toString().replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è');
				Labels[key] = result;
			}
		});
		var data = [
			[Labels.Status, Quote.xp.Status],
			[Labels.QuoteNumber, $filter('MaskedQuoteID')(Quote.ID)],
            [Labels.QuoteName, (Quote.xp && Quote.xp.Name ? Quote.xp.Name : "")],
			[Labels.YourReference, (Quote.xp && Quote.xp.RefNum ? Quote.xp.RefNum : "")],
			[Labels.PONumber, (payment && payment.xp && payment.xp.PONumber ? payment.xp.PONumber : "")],
			["", ""],
			[Labels.SerialNum, Labels.TagNum, Labels.PartNum, Labels.PartDesc, Labels.RecRepl, Labels.LeadTime, Labels.Currency, Labels.PricePer, Labels.Quantity]
		];

		function getCurrentCurrency(qte) {
		    var curr = (qte && qte.xp && qte.xp.Currency) ? qte.xp.Currency.ConvertTo : null;
		    curr = curr || $cookies.get('curr').replace(/^"(.+(?="$))"$/, '$1');
		    switch (curr) {
		        case "USD":
		        case "AUD":
		            return '$';
		        case "EUR": return "€";
		        case "ZAR": return 'R';
		        case "GBP":
		        default:
		            return "£";
		    }
		}
		var currency = getCurrentCurrency(Quote); //(Quote.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((Quote.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));
		function roundHalfEven(x) {
		    return (Math.floor(100 * x + 0.5)) / 100;
		}
		function orderconversion(amt, order) {
		    var orderRate = (order.xp && order.xp.Currency && order.xp.Currency.Rate) ? order.xp.Currency.Rate : 0;
		    var rte = orderRate || $cookies.get('rate');
		    return (rte) ? roundHalfEven(amt * rte) : amt;
		}

		angular.forEach(LineItems, function (item) {
			var line = [];
			line.push(item.xp.SN);
			line.push(item.xp.TagNumber);
			line.push(item.xp.ProductName);
			line.push(item.xp.Description);
			line.push(item.xp.ReplacementSchedule);
			line.push(item.xp.LeadTime);
			line.push(currency);
			line.push(orderconversion(item.UnitPrice, Quote));
			line.push(item.Quantity);
			data.push(line);
		});
		if(Quote.xp.ShippingDescription) {
		    data.push(["", "", "", Quote.xp.ShippingDescription, "", "", currency, orderconversion(Quote.ShippingCost, Quote), ""]);
		}
		data.push(["", "", "", "", "", Labels.Total, currency, orderconversion(Quote.Total, Quote)]);
		data.push(["", ""]);
		data.push([Labels.DeliveryAddress]);
		if (DeliveryAddress) {
			if(DeliveryAddress.Country=="GB") {
				data.push([DeliveryAddress.FirstName + " " + DeliveryAddress.LastName, ""]);
				data.push([DeliveryAddress.CompanyName]);
				data.push([DeliveryAddress.Street1]);
                DeliveryAddress.Street2 ? data.push([DeliveryAddress.Street2]) : null;
                DeliveryAddress.xp.Street3 ? data.push([DeliveryAddress.xp.Street3]) : null;
				data.push([DeliveryAddress.City]);
				data.push([DeliveryAddress.Zip]);
				data.push([Quote.CountryName]);
			} else if (DeliveryAddress.Country=="FR") {
				data.push([DeliveryAddress.FirstName + " " + DeliveryAddress.LastName, ""]);
				data.push([DeliveryAddress.CompanyName]);
                DeliveryAddress.Street1 ? data.push([DeliveryAddress.Street1]) : null;
                DeliveryAddress.Street2 ? data.push([DeliveryAddress.Street2]) : null;
                DeliveryAddress.xp.Street3 ? data.push([DeliveryAddress.xp.Street3]) : null;
                DeliveryAddress.City ? data.push([DeliveryAddress.City]) : null;
                DeliveryAddress.State ? data.push([DeliveryAddress.State]) : null;
                DeliveryAddress.Zip ? data.push([DeliveryAddress.Zip]) : null;
                DeliveryAddress.Country ? data.push([Quote.CountryName]) : null;
			}
		}
		data.push(["", ""]);
		data.push([Labels.Comments]);
		angular.forEach(Quote.xp.CommentsToWeir, function(comment) {
			data.push(["",comment.by,$filter('weirdate')(comment.date)]);
			data.push(["","",comment.val]);
		});
		return data;
	}
	var service = {
		ToCsvJson: ToCsvJson
	};
	return service;
}
