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
		})
}

function HomeController($sce, $state, $rootScope, WeirService, SearchProducts) {
    var vm = this;
    vm.CurrentUser = $rootScope.currentUser;
	vm.CurrentUserOrg = $rootScope.myOrg;
    var labels = {
        en: {
            Search : "Search centre",
            PlatformMsg1 : "Plan in advance for shutdowns, servicing or outages. Rapidly create and save quotes for spares for your valves. View spares lists for your valves and submit your orders. All submitted quotes and orders will be checked and confirmed by your existing valve support team.",
            PlatformMsg2Header : "How to use the platform",
            PlatformMsg2 : "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui massa, vestibulum in malesuada vehicula, porttitor at turpis. Nulla facilisi. Vestibulum eu imperdiet nisl.",
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
            Search : "Centre de recherche",
            PlatformMsg1 : "Planifiez à l'avance les arrêts, les réparations ou les pannes. Créez et enregistrez rapidement des devis pour les pièces de rechange pour vos vannes. Consultez les listes de pièces détachées pour vos vannes et soumettez vos commandes. Toutes les soumissions soumises et les commandes seront vérifiées et confirmées par votre équipe existante de soupape.",
            PlatformMsg2Header : "Comment utiliser la plate-forme",
            PlatformMsg2 : "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui massa, vestibulum in malesuada vehicula, porttitor at turpis. Nulla facilisi. Vestibulum eu imperdiet nisl.",
            DetailsSearchHeader : "Chercher",
            DeatilsSearchMsg : "Recherche par numéro de série Weir, numéro de pièce Weir ou votre numéro de tag. Parcourez la recherche de résultats et visualisez les pièces associées associées.",
            DetailsQuoteHeader : "Citation",
            DetailsQuoteMsg : "Créez votre devis pour vos pièces de rechange et consultez les prix et les délais. Vous pouvez également enregistrer et partager vos devis avec votre propre référence",
            DetailsDetailsHeader : "Détails",
            DetailsDetailsMsg : "Envoyez une documentation de référence et des commentaires à votre devis ou votre commande afin de nous aider à vous donner le meilleur prix adapté à vos besoins.",
            DetailsSubmitHeader : "Soumettre",
            DetailsSubmitMsg : "Vous pouvez soumettre votre devis afin que nous puissions vérifier et confirmer votre devis avant de passer votre commande.",
            OrderMsg : "Votre confirmation de commande vous sera envoyée par e-mail et Weir mettra à jour l'ordre de la plate-forme avec le numéro de contrat",
            Brands: "Marques",
            BrandsMsg: "Explorez les marques du groupe Weir à l'aide de leurs pages de marque individuelles ci-dessous.",
            SerialNumber: "Numéro de série",
            PartNumber: "Numéro de pièce",
            TagNumber: "Numéro du tag",
            SarasinRSBD: "Sarasin RSBD®",
            SarasinRSBDMsg: "Lorem...."
        }
    };
    vm.LanguageUsed = WeirService.Locale();
    vm.labels = WeirService.LocaleResources(labels);
    //to be shown in html, using the id to filter which search controller to leverage
    vm.SearchOptions = [vm.labels.SerialNumber, vm.labels.PartNumber, vm.labels.TagNumber];
    vm.selectedItem = vm.SearchOptions[0];
    vm.SearchParams = "";
    vm.dropboxSelectedItem = function(label){
        vm.selectedItem = label;
    };
    //using a repeater to display these in a div.
    vm.BrandUK = [{title: vm.labels.Batley, description: vm.labels.BatleyMsg, url: vm.labels.Batley.replace(" ", "-").replace("®", "").toLowerCase()}, {title: vm.labels.Blakeborough, description: vm.labels.BlakeboroughMsg, url: vm.labels.Blakeborough.replace("®", "").toLowerCase()}, {title: vm.labels.Hopkinsons, description: vm.labels.HopkinsonsMsg, url: vm.labels.Hopkinsons.replace("®", "").toLowerCase()}];
    vm.BrandFR = [{title: vm.labels.SarasinRSBD, description: vm.labels.SarasinRSBDMsg}];
	vm.SearchProducts = function(val) {
		var options = {
			"Serial number": "GetAllSerialNumbers",
			"Part number": "GetAllPartNumbers",
			"Tag number": "GetAllTagNumbers"
		};
		return SearchProducts[options[vm.selectedItem]](val);
	};

    vm.Search = function(searchType, searchParam){
        //assumption is that this is a singular search bar. Only querying for a single item at a time.
        var searchState;
        switch (searchType){
            case(vm.labels.SerialNumber):
                //the chaining of the state.go rather than go to child is done due to the parent (search) resovles a promise and blocks the child.
                $state.go('search').then(function(){
                    $state.go('search.serial.results', {numbers: searchParam}, {});
                });
                break;
            case(vm.labels.TagNumber):
                $state.go('search').then(function(){
                $state.go('search.tag.results', {numbers: searchParam}, {});
                });
                break;
            case(vm.labels.PartNumber):
                $state.go('search').then(function(){
                $state.go('search.part.results', {numbers: searchParam}, {});
                });
                break;
        }
    };

}