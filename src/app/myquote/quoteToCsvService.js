angular.module('orderCloud')
	.service('QuoteToCsvService', QuoteToCsvService);

function QuoteToCsvService($filter,$sce,OCGeography,Underscore) {
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

		var currency = (Quote.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((Quote.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));

		angular.forEach(LineItems, function (item) {
			var line = [];
			line.push(item.xp.SN);
			line.push(item.xp.TagNumber);
			line.push(item.xp.ProductName);
			line.push(item.xp.Description);
			line.push(item.xp.ReplacementSchedule);
			line.push(item.xp.LeadTime);
			line.push(currency);
			line.push(item.UnitPrice);
			line.push(item.Quantity);
			data.push(line);
		});
		if(Quote.xp.ShippingDescription) {
			data.push(["", "", "", Quote.xp.ShippingDescription, "", "", currency, Quote.ShippingCost, ""]);
		}
		data.push(["", "", "", "", "", Labels.Total, currency, Quote.Total]);
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
