angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)
;

function HomeConfig($stateProvider, $sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist([
		'self',
		'https://www.global.weir/brands/**'
	]);
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
            resolve: {
                Language: function(OrderCloud, $cookieStore, WeirService) {
                    var cust = OrderCloud.BuyerID.Get();
                    if(!cust) return;
                    OrderCloud.Buyers.Get(cust).then(function (buyer) {
                        var lang = WeirService.Locale();
                        //set the expiration date of the cookie.
                        var now = new Date();
                        var exp = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
                        if (buyer.xp.WeirGroup.id == 2 && lang == 'en') {
                            //make it fr
                            lang = "fr";
                            $cookieStore.put('language', 'fr', {
                                expires: exp
                            });

                        }
                        if (buyer.xp.WeirGroup.id == 1 && lang == 'fr') {
                            //make it en
                            lang = "en";
                            $cookieStore.put('language', 'en', {
                                expires: exp
                            });

                        }
                    });
                }
            }
		});
}

function HomeController($sce, $state, WeirService, SearchProducts, Me, SearchTypeService) {
    var vm = this;
	if(WeirService.Locale() == 'fr') {
		SearchTypeService.SetGlobalSearchFlag(true);
	} else {
		SearchTypeService.SetGlobalSearchFlag(false);
	}
    vm.CurrentUser = Me.Profile;
	vm.CurrentUserOrg = Me.Org;
    var labels = {
        en: {
            Search : "Search centre",
            PlatformMsg1 : "Plan in advance for shutdowns, servicing or outages. Rapidly create and save quotes for spares for your valves. View spares lists for your valves and submit your orders. All submitted quotes and orders will be checked and confirmed by your existing valve support team.",
            PlatformMsg2Header : "How to use the platform",
            PlatformMsg2 : "Search by serial number or part number, create your quote, upload your documentation and submit your quote or order.",
            DetailsSearchHeader : "Search",
            DeatilsSearchMsg : "Search by Weir serial number, Weir part number or your Tag number. Browse the result search and view spares associated valve.",
            DetailsQuoteHeader : "Quote",
            DetailsQuoteMsg : "Create your Quote for your valve spares and view prices and lead times. You can also save and share your quotes with your own reference",
            DetailsDetailsHeader : "Details",
            DetailsDetailsMsg : "Upload reference documentation and comments to your quote or your order to help us to give you the best price adapted to your needs.",
            DetailsSubmitHeader : "Submit",
            DetailsSubmitMsg : "You can submit your quote to us so we can check and confirm your quote before you place your order.",
            OrderMsg : "Your order confirmation will be emailed to you and Weir will update the platform order with the contract number",
            Brands: "Brands",
            BrandsMsg: "Explore the Weir Group;s brands using their individual brand pages below.",
            Batley: "Batley Valve®",
            BatleyMsg: "Weir manufactures an extensive range of butterfly valves for isolation and control applications under the Batley Valve® brand.",
            Blakeborough: "Blakeborough®",
            BlakeboroughMsg: "The Blakeborough® brand has been at the forefront of designing and manufacturing control, choke and steam conditioning valves for more than 70 years.",
            Hopkinsons: "Hopkinsons®",
            HopkinsonsMsg: "Established over 160 years ago, the Hopkinsons® brand is renowned for long and dependable service life, generation after generation.",
            SerialNumber: "Serial number",
            PartNumber: "Part number",
            TagNumber: "Tag number"
        },
        fr: {
            Search : $sce.trustAsHtml("Centre de recherche"),
            PlatformMsg1 : $sce.trustAsHtml("Planifiez à l'avance les arrêts, les réparations ou les pannes. Créez et enregistrez rapidement des devis pour les pièces de rechange pour vos vannes. Consultez les listes de pièces détachées pour vos vannes et soumettez vos commandes. Toutes les soumissions soumises et les commandes seront vérifiées et confirmées par votre équipe existante de soupape."),
            PlatformMsg2Header : $sce.trustAsHtml("Comment utiliser la plate-forme"),
            PlatformMsg2 : $sce.trustAsHtml("Recherchez par numéro de série ou numéro de pièce, créez vos cotations, téléchargez votre documentation et soumettez vos cotations ou commandes."),
            DetailsSearchHeader : $sce.trustAsHtml("Chercher"),
            DeatilsSearchMsg : $sce.trustAsHtml("Recherche par numéro de série Weir, numéro de pièce Weir ou votre numéro de tag. Parcourez la recherche de résultats et visualisez les pièces associées associées."),
            DetailsQuoteHeader : $sce.trustAsHtml("Citation"),
            DetailsQuoteMsg : $sce.trustAsHtml("Créez votre devis pour vos pièces de rechange et consultez les prix et les délais. Vous pouvez également enregistrer et partager vos devis avec votre propre référence"),
            DetailsDetailsHeader : $sce.trustAsHtml("Détails"),
            DetailsDetailsMsg : $sce.trustAsHtml("Envoyez une documentation de référence et des commentaires à votre devis ou votre commande afin de nous aider à vous donner le meilleur prix adapté à vos besoins."),
            DetailsSubmitHeader : $sce.trustAsHtml("Soumettre"),
            DetailsSubmitMsg : $sce.trustAsHtml("Vous pouvez soumettre votre devis afin que nous puissions vérifier et confirmer votre devis avant de passer votre commande."),
            OrderMsg : $sce.trustAsHtml("Votre confirmation de commande vous sera envoyée par e-mail et Weir mettra à jour l'ordre de la plate-forme avec le numéro de contrat"),
            Brands: $sce.trustAsHtml("Marques"),
            BrandsMsg: $sce.trustAsHtml("Découvrez les marques du groupe Weir en utilisant les pages individuelles de chaque marque ci-dessous."),
            SerialNumber: $sce.trustAsHtml("Numéro de série"),
            PartNumber: $sce.trustAsHtml("Numéro de pièce"),
            TagNumber: $sce.trustAsHtml("Numéro du tag"),
            SarasinRSBD:"Sarasin RSBD®",
            SarasinRSBDMsg: "Les soupapes de sûreté à ressort et pilotées Sarasin-RSBD® sont conçues pour garantir des performances, une sécurité et une fiabilité optimales."
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
        var searchState;
        switch (searchType){
            case(vm.labels.SerialNumber):
                //the chaining of the state.go rather than go to child is done due to the parent (search) resolves a promise and blocks the child.
                $state.go('search')
	                .then(function(){
                        $state.go('search.serial.detail', {number: searchParam}, {});
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
}