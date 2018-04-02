angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(printData,$timeout,$window,$uibModalInstance,WeirService,$sce,QuoteShareService, $filter) {
	//ToDo use the QuoteShareService
	var vm = this;
	vm.catalog = printData.catalog;
	vm.buyer = printData.buyer;
	vm.order = printData.uitotal == -1 ? QuoteShareService.Quote : printData.order;
	vm.items = printData.items;
	vm.address = printData.address;
	vm.pocontent = printData.pocontent;
    // vm.currency = (vm.order.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((vm.order.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));
	var curr = WeirService.CurrentCurrency(vm.Quote);
	vm.currency = curr.symbol;

	if(printData.uitotal == -1) { // We are in myquote and using the exworks or standard (whether buyer or catalog)
	    vm.uitotal = $filter('OrderConversion')(QuoteShareService.UiTotal, QuoteShareService.Quote);
		if(QuoteShareService.Quote.xp.CarriageRateType == 'standard') {
		    vm.CarriageRateForBuyer = (vm.buyer.xp.UseCustomCarriageRate && vm.buyer.xp.UseCustomCarriageRate == true) ? vm.buyer.xp.CustomCarriageRate : vm.catalog.xp.StandardCarriage;
		    vm.CarriageRateForBuyer = $filter('OrderConversion')(vm.CarriageRateForBuyer, QuoteShareService.Quote);
			vm.CarriageRateForBuyer = vm.CarriageRateForBuyer.toFixed(2);
		} else {
			vm.CarriageRateForBuyer = 'POA';
		}
	} else {
	    vm.uitotal = $filter('OrderConversion')(printData.order.Total, printData.order);
		vm.CarriageRateForBuyer = vm.order.ShippingCost;
		vm.CarriageRateForBuyer = $filter('OrderConversion')(vm.CarriageRateForBuyer, printData.order);
		vm.CarriageRateForBuyer = vm.CarriageRateForBuyer.toFixed(2);
	}

	var labels = {
		en: {
			QuoteNumber: "Quote Number; ",
            QuoteName: "Quote Name; ",
			YourReference: "Your Reference No; ",
			PONumber: "PO Number;",
			SerialNum: "Serial Number",
			TagNum: "Tag Number (if available)",
			PartNum: "Part Number",
			PartDesc: "Description of Part",
			RecRepl: "Recommended Replacement (yrs)",
			LeadTime: "Lead Time (days)",
			PricePer: "Price per Item or Set",
			Quantity: "Quantity",
			Total: "Total",
			DeliveryAddress: "Delivery Address",
			POAShipping: "POA",
			DescriptionOfShipping: {
				exworks:'Carriage - Ex Works',
				standard:'Carriage Charge'
			}
		},
		fr: {
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("Nom de la cotation "),
			YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
			PONumber: $sce.trustAsHtml("Numéro de bon de commande;"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Numéro de repère soupape"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
			POAShipping: "POA",
			DescriptionOfShipping: {
				exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
				standard:$sce.trustAsHtml('Frais de livraison')
			}
		}
	};
	vm.labels = labels[WeirService.Locale()];

    vm.close = function() {
        $uibModalInstance.dismiss();
    };

	$timeout($window.print,10);
}

function PrintOrderButtonControl($scope,imageRoot,WeirService,$uibModal,$sce,$document,Me) {
	var vm = this;
	var labels = {
		en: {
			print:'Print'
		},
		fr: {
			print: $sce.trustAsHtml("Imprimer")
		}
	};
	vm.labels = labels[WeirService.Locale()];
	vm.GetImageUrl = function(img) {
		return imageRoot + img;
	};

	vm.Print = function() {
		var printData = {
			catalog:$scope.catalog,
			buyer:$scope.buyer,
			order:$scope.order,
			items:$scope.items,
			address:$scope.address,
			pocontent:$scope.pocontent,
			uitotal:$scope.uitotal
		};
		var templates = {
			WVCUK:'common/print-order/templates/printorder.tpl.html',
			WPIFR:'common/print-order/templates/printorderfr.tpl.html'
		};
		var parentElem = angular.element($document[0].querySelector('body'));
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:templates[Me.Org.xp.WeirGroup.label],
			controller:'printOrderCtrl',
			controllerAs:'printctrl',
			appendTo: parentElem,
			resolve: {
				printData:printData
			}
		});
	}
}

function PrintOrderButtonDirective () {
	return {
		restrict:'E',
		scope: {
			catalog:'=catalog',
			buyer:'=buyer',
			order:'=order',
			items:'=items',
			address:'=address',
			pocontent:'=pocontent',
			uitotal:'=uitotal'
		},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}