angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)
;

function HomeConfig($stateProvider) {
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
            resolve: {
                quotes: function(OrderCloudSDK) {
                    var opts = {
                        'pageSize':10,
                        'sortBy':'DateCreated',
                        'filters':{
                            'xp.Type':'Quote',
                            'xp.Status':'!DR',
                            'xp.Active':true
                        }
                    };
                    return OrderCloudSDK.Orders.List("Outgoing",opts);
                },
			    orders: function(OrderCloudSDK) {
			        var opts = {
			            'pageSize':10,
                        'sortBy':'DateCreated',
                        'filters':{
			                'xp.Type':'Order',
                            'xp.Active':true
                        }
                    };
			        return OrderCloudSDK.Orders.List("Outgoing",opts);
                }
            }
		});
}

function HomeController($sce, $state, WeirService, SearchProducts, Me, SearchTypeService, orders, quotes) {
    var vm = this;
	if(WeirService.Locale() == 'fr') {
		SearchTypeService.SetGlobalSearchFlag(true);
	} else {
		SearchTypeService.SetGlobalSearchFlag(false);
	}
    vm.CurrentUser = Me.Profile;
	vm.CurrentUserOrg = Me.Org;
	vm.orders = orders;
	vm.quotes = quotes;
	vm.LookupStatus = WeirService.LookupStatus;
	vm.locale =  WeirService.Locale;
	vm.StatusLabel = function(status) {
	    var statusObj = WeirService.LookupStatus(status);
	    return statusObj.label[WeirService.Locale()];
    };

    vm.OrderAction = _actions;
    function _actions(action) {
        var filter = {
            "quotes.all": {
                "xp.Type": "Quote",
                "xp.Active": true
            }
        };
        $state.go(action, { filters: JSON.stringify(filter[action]) }, { reload: true });
    }

    var labels = {
        en: {
            Search : "Search centre",
            PlatformMsg1 : "Plan in advance for shutdowns, servicing or outages. Rapidly create and save quotes for spares for your valves. View spares lists for your valves and submit your orders. All submitted quotes and orders will be checked and confirmed by your existing valve support team.",
            PlatformMsg2Header : "How to use the platform",
            PlatformMsg2 : "Search by serial number or part number, create your quote, upload your documentation and submit your quote or order.",
            DetailsSearchHeader : "Search",
            DeatilsSearchMsg : "Search by Weir serial number, Weir part number or your Tag number. Search and view spares associated to your valves.",
            DetailsQuoteHeader : "Quote",
            DetailsQuoteMsg : "Create your quote for your valve spares and view prices and lead times. You can also save and share your quotes with your own reference.",
            DetailsDetailsHeader : "Details",
            DetailsDetailsMsg : "Upload reference documentation and comments to your quote or your order to help us to give you the best price adapted to your needs.",
            DetailsSubmitHeader : "Submit",
            DetailsSubmitMsg : "You can submit your quote to us so we can check and confirm your quote before you place your order.",
            OrderMsg : "Your order confirmation will be emailed to you and Weir will update the platform order with the contract number",
            Brands: "Brands",
            BrandsMsg: "Explore the Weir Group's brands using their individual brand pages below.",
            Batley: "Batley Valve®",
            BatleyMsg: "Weir manufactures an extensive range of butterfly valves for isolation and control applications under the Batley Valve® brand.",
            Blakeborough: "Blakeborough®",
            BlakeboroughMsg: "The Blakeborough® brand has been at the forefront of designing and manufacturing control, choke and steam conditioning valves for more than 70 years.",
            Hopkinsons: "Hopkinsons®",
            HopkinsonsMsg: "Established over 160 years ago, the Hopkinsons® brand is renowned for long and dependable service life, generation after generation.",
            SerialNumber: "Serial number",
            PartNumber: "Part number",
            TagNumber: "Tag number",
	        PlaceHolder: "Enter serial, part, or tag number.",
            YourDashboard: "Your Dashboard",
            YourQuotes: "Your Quotes",
            YourOrders: "Your Orders",
            QuoteNumber: "Weir Quote No.",
            QuoteReference: "Your Quote Ref:",
            OrderNumber: "Weir Order No.",
            OrderReference: "Your Order Ref",
            Total: "Total",
            Status: "Status",
            AllQuotes: "View All Quotes",
            AllOrders: "View All Orders"
        },
        fr: {
            Search : $sce.trustAsHtml("Centre de recherche"),
            PlatformMsg1 : $sce.trustAsHtml("Planifiez à l'avance les arrêts de maintenance, les réparations ou les pannes. Créez et enregistrez rapidement des cotations de pièces de rechange pour vos soupapes de sûreté. Consultez les listes de pièces détachées pour vos soupapes et soumettez vos commandes. Toutes les cotations soumises et les commandes seront vérifiées et confirmées par l'équipe après-vente."),
            PlatformMsg2Header : $sce.trustAsHtml("Comment utiliser la plate-forme"),
            PlatformMsg2 : $sce.trustAsHtml("Recherchez par numéro de série ou numéro de pièce, créez vos cotations, téléchargez votre documentation et soumettez vos cotations ou commandes."),
            DetailsSearchHeader : $sce.trustAsHtml("Chercher"),
            DeatilsSearchMsg : $sce.trustAsHtml("Rechercher par numéro de série Weir, numéro de pièce Weir ou votre numéro de tag. Parcourez la recherche de résultats et visualisez les pièces associées."),
            DetailsQuoteHeader : $sce.trustAsHtml("Cotation"),
            DetailsQuoteMsg : $sce.trustAsHtml("Créez votre cotation pour vos pièces de rechange et consultez les prix et les délais. Vous pouvez également enregistrer et partager vos devis avec votre propre référence"),
            DetailsDetailsHeader : $sce.trustAsHtml("Détails"),
            DetailsDetailsMsg : $sce.trustAsHtml("Envoyez une documentation et des commentaires à votre cotation ou à votre commande pour nous aider à vous donner le meilleur prix adapté à vos besoins."),
            DetailsSubmitHeader : $sce.trustAsHtml("Soumettre"),
            DetailsSubmitMsg : $sce.trustAsHtml("Vous pouvez soumettre votre cotation afin que nous puissions vérifier et confirmer votre devis avant de passer votre commande."),
            OrderMsg : $sce.trustAsHtml("Votre confirmation de commande vous sera envoyée par e-mail. Weir actualisera le statut sur la plate-forme avec la création d'un numéro de contrat"),
            Brands: $sce.trustAsHtml("Marques"),
            BrandsMsg: $sce.trustAsHtml("Découvrez les marques du groupe Weir en utilisant les pages individuelles de chaque marque ci-dessous."),
            SerialNumber: $sce.trustAsHtml("Numéro de série"),
            PartNumber: $sce.trustAsHtml("Numéro de pièce"),
            TagNumber: $sce.trustAsHtml("Numéro du tag"),
            SarasinRSBD: $sce.trustAsHtml("Sarasin RSBD™"),
            SarasinRSBDMsg: $sce.trustAsHtml("Les soupapes de sûreté à ressort et pilotées Sarasin-RSBD™ sont conçues pour garantir des performances, une sécurité et une fiabilité optimales."),
	        PlaceHolder: $sce.trustAsHtml("Renseigner un numéro de série, de pièce ou de repère soupape."),
            YourDashboard: $sce.trustAsHtml("FR: Your Dashboard"),
            YourQuotes: $sce.trustAsHtml("FR: Your Quotes"),
            YourOrders: $sce.trustAsHtml("FR: Your Orders"),
            QuoteNumber: $sce.trustAsHtml("FR: Weir Quote No."),
            QuoteReference: $sce.trustAsHtml("FR: Your Quote Ref:"),
            OrderNumber: $sce.trustAsHtml("FR: Weir Order No."),
            OrderReference: $sce.trustAsHtml("FR: Your Order Ref"),
            Total: $sce.trustAsHtml("FR: Total"),
            Status: $sce.trustAsHtml("FR: Status"),
            AllQuotes: $sce.trustAsHtml("FR: View All Quotes"),
            AllOrders: $sce.trustAsHtml("FR: View All Orders")
        }
    };
    vm.LanguageUsed = WeirService.Locale();
    vm.labels = WeirService.LocaleResources(labels);
    //to be shown in html, using the id to filter which search controller to leverage
    vm.SearchOptions = [
	    {
	    	opt:0,
		    label:vm.labels.SerialNumber
	    },
	    {
		    opt:1,
		    label:vm.labels.PartNumber
	    },
		{
			opt:2,
			label:vm.labels.TagNumber
		}
	];
    vm.selectedItem = vm.SearchOptions[0];
    vm.SearchParams = "";
    vm.dropboxSelectedItem = function(label){
        vm.selectedItem = label;
    };
    //using a repeater to display these in a div.
    if(vm.LanguageUsed == 'en' ) vm.BrandUK = [{title: vm.labels.Batley, description: vm.labels.BatleyMsg, url: "0"}, {title: vm.labels.Blakeborough, description: vm.labels.BlakeboroughMsg, url: "1"}, {title: vm.labels.Hopkinsons, description: vm.labels.HopkinsonsMsg, url: "2"}];
    if(vm.LanguageUsed == 'fr' ) vm.BrandFR = [{title: vm.labels.SarasinRSBD, description: vm.labels.SarasinRSBDMsg, url: "3"}];

	vm.SearchProducts = function(val) {
		//The search method to execute.
		var serial = 0;
		var part = 1;
		var tag = 2;
		var options = {};
		options[serial] = "GetAllSerialNumbers";
		options[part] = "GetAllPartNumbers";
		options[tag] = "GetAllTagNumbers";
		return SearchProducts[options[vm.selectedItem.opt]](val);
	};

    vm.Search = function(searchType, searchParam){
        //assumption is that this is a singular search bar. Only querying for a single item at a time.
        switch (searchType){
            case(vm.labels.SerialNumber):
                //the chaining of the state.go rather than go to child is done due to the parent (search) resolves a promise and blocks the child.
	            var serNum = angular.copy(searchParam);
                serNum = serNum.split(" - ")[0];
                $state.go('search')
	                .then(function(){
                        $state.go('search.serial.detail', {number: serNum}, {});
                    });
                break;
            case(vm.labels.TagNumber):
                $state.go('search')
	                .then(function(){
                        $state.go('search.tag.results', {numbers: searchParam}, {});
                    });
                break;
            case(vm.labels.PartNumber):
                $state.go('search')
	                .then(function(){
                        $state.go('search.part.results', {numbers: searchParam}, {});
                    });
                break;
        }
    };

    vm.GoToOrder = function(orderId) {
        $state.go("orders.goto", { orderID: orderId } );
    };

    vm.GoToQuote = function(orderId) {
        $state.go("quotes.goto", { quoteID: orderId } );
    };
}