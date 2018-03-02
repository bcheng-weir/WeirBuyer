angular.module('ordercloud-search', []);

angular.module('ordercloud-search')
	.directive('ordercloudSearch', OrdercloudSearch)
	.controller('ordercloudSearchCtrl', OrdercloudSearchController)
	.factory('TrackSearch', TrackSearchService )
	.factory('SearchProducts', SearchProductsService)
;

function OrdercloudSearch () {
	return {
		scope: {
			placeholder: '@',
			servicename: '@',
			controlleras: '='
		},
		restrict: 'E',
		templateUrl: 'common/search/templates/search.tpl.html',
		controller: 'ordercloudSearchCtrl',
		controllerAs: 'ocSearch',
		replace: true
	}
}

function OrdercloudSearchController($timeout, $scope, OrderCloudSDK, TrackSearch) {
	$scope.searchTerm = null;
	if ($scope.servicename) {
		var var_name = $scope.servicename.replace(/([a-z])([A-Z])/g, '$1 $2');
		$scope.placeholder = "Search " + var_name + '...';
		var Service = OrderCloudSDK[$scope.servicename];
	}
	var searching;
	$scope.$watch('searchTerm', function(n,o) {
		if (n == o) {
			if (searching) $timeout.cancel(searching);
		} else {
			if (searching) $timeout.cancel(searching);
			searching = $timeout(function() {
				n == '' ? n = null : angular.noop();
				TrackSearch.SetTerm(n);
				if($scope.servicename === 'Orders') {
					if (!$scope.controlleras.searchfunction) {
						Service.ListIncoming(null, null, n)
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
					else {
						$scope.controlleras.searchfunction($scope.searchTerm)
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
				}
				else if ($scope.servicename === 'SpendingAccounts') {
					if (!$scope.controlleras.searchfunction) {
						Service.List(n, null, null, null, null, {'RedemptionCode': '!*'})
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
					else {
						$scope.controlleras.searchfunction($scope.searchTerm)
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
				}
				else if ($scope.servicename === 'Shipments') {
					if (!$scope.controlleras.searchfunction) {
						Service.List(null, n, null, null)
							.then(function (data) {
								$scope.controlleras.list = data;
							});
					}
					else {
						$scope.controlleras.searchfunction($scope.searchTerm)
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
				}
				else {
					if (!$scope.controlleras.searchfunction) {
						Service.List(n)
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
					else {
						$scope.controlleras.searchfunction($scope.searchTerm)
							.then(function (data){
								$scope.controlleras.list = data;
							});
					}
				}

			}, 300);
		}
	});
}

function TrackSearchService() {
	var service = {
		SetTerm: _setTerm,
		GetTerm: _getTerm
	};

	var term = null;

	function _setTerm(value) {
		term = value;
	}

	function _getTerm() {
		return term;
	}

	return service;
}

function SearchProductsService($q, OrderCloudSDK, Me, SearchTypeService, WeirService) {
	//This service handles type ahead. for app/search and app/home.
	var service = {
		GetAllSerialNumbers: _getAllSerialNumbers,
		GetAllTagNumbers: _getAllTagNumbers,
		GetAllPartNumbers: _getAllPartNumbers,
		GetPart: _getPart
	};
	var partResults = {};
    //First three are the home page search methods.
	function _getAllSerialNumbers(lookForThisPartialSerialNumber) {
		var dfd = $q.defer();
		var filter = {
			"xp.SN": lookForThisPartialSerialNumber + "*"
		};
		if (Me.Org.xp.WeirGroup.id === "1") { // No global search for UK.
			filter.ParentID = Me.Org.ID;
		}

		//depth:Me.Org.xp.WeirGroup.id == "1" ? null:"all",
		OrderCloudSDK.Me.ListCategories({
				page:1,
				pageSize:20,
            	sortBy: "Name",
				filters:filter,
            	depth:"all",
				catalogID:Me.Org.xp.WeirGroup.label})
			.then(function(response) {
				OrderCloudSDK.Me.ListCategories({
						search:lookForThisPartialSerialNumber,
						page:1,
						pageSize:20,
						searchOn:"Description",
						depth:"all",
						catalogID:Me.Org.xp.WeirGroup.label})
					.then(function (responseDescription) {
						var returnResults = response.Items.concat(responseDescription.Items);
						returnResults = _.filter(returnResults, function(item) { return item.ParentID != null; }); //We do this to get rid of the top level category descriptions.
						returnResults = _.uniq(returnResults, false, function (cat) { return cat.xp.SN; });
						dfd.resolve(WeirService.SetEnglishTranslationParts(returnResults));
					})
					.catch(function(ex) {
						console.log(ex);
						dfd.reject(ex);
					});
			})
			.catch(function(ex) {
				console.log(ex);
				dfd.reject(ex);
			});
		return dfd.promise;
	}

    function _getAllTagNumbers(lookForThisPartialTagNumber) {
    	var dfd = $q.defer();
	    var filter = {
		    "xp.TagNumber":lookForThisPartialTagNumber+"*"
	    };
	    if(Me.Org.xp.WeirGroup.id=="1") { //No global search for UK
		    filter.ParentID = Me.Org.ID; //Not on tag number.
	    }

	    OrderCloudSDK.Me.ListCategories({
				'page':1,
				'pageSize':20,
            	'sortBy': "Name",
				'filters':filter,
				'depth':"all",
				'catalogID':Me.Org.xp.WeirGroup.label })
            .then(function(response) {
            	dfd.resolve(WeirService.SetEnglishTranslationParts(response.Items));
            });
	    return dfd.promise;
    }

    function _getAllPartNumbers(lookForThisPartialPartNumber) {
    	var dfd = $q.defer();
	    OrderCloudSDK.Me.ListProducts({
				'page':1,
				'pageSize':20,
            	'sortBy': "Name",
            	'search': Me.Org.xp.WeirGroup.label,
            	'searchOn': "ID",
				'filters':{
					"Name": lookForThisPartialPartNumber+"*"
				}})
            .then(function(response) {
	            if(Me.Org.xp.WeirGroup.label == "WVCUK") {
		            partResults = response.Items;
		            return OrderCloudSDK.Me.ListProducts({
							'page':1,
							'pageSize':20,
                        	'sortBy': "Name",
                        	'search': Me.Org.xp.WeirGroup.label,
                        	'searchOn': "ID",
							'filters':{
								"xp.AlternatePartNumber":lookForThisPartialPartNumber+"*"
							}})
			            .then(function(altResponse) {
				            partResults.push.apply(altResponse.Items);
				            //return partResults;
				            dfd.resolve(WeirService.SetEnglishTranslationParts(partResults));
			            });
	            } else {
	            	//response.Items;
		            dfd.resolve(WeirService.SetEnglishTranslationParts(response.Items));
	            }
            });
	    return dfd.promise;
    }

    //This method is used in the main search that is NOT the home page.
	function _getPart(lookForThisProduct, forThisCustomer) {
        var dfd = $q.defer();
		var filter = {
			"s":{
				"xp.SN":lookForThisProduct+"*"
			},
			"t":{
				"xp.TagNumber":lookForThisProduct+"*"
			},
			"p":{
				"WPIFR":{
					"primary": {
						"Name":lookForThisProduct+"*"
					}
				},
				"WVCUK":{
					"primary":{
						"Name":lookForThisProduct+"*"
					},
					"secondary":{
						"xp.AlternatePartNumber":lookForThisProduct+"*"
					}
				}
			}
		};

		//If a UK user, OR not a global search, and a serial search: set a ParentID filter
		if((SearchTypeService.GetLastSearchType() === "s" || SearchTypeService.GetLastSearchType() === "t") && (Me.Org.xp.WeirGroup.id==="1")) {
			filter[SearchTypeService.GetLastSearchType()].ParentID = forThisCustomer.id;
		}

		if(SearchTypeService.GetLastSearchType() === "p") {
			//return
			OrderCloudSDK.Me.ListProducts({
					'search':forThisCustomer.id.substring(0,5),
                	'searchOn': "ID",
					'page':1,
					'pageSize':20,
                	'sortBy': "Name",
					'filters':filter[SearchTypeService.GetLastSearchType()][Me.Org.xp.WeirGroup.label].primary} )
				.then(function(response) {
					if(Me.Org.xp.WeirGroup.label === "WVCUK") {
						partResults = response.Items;
						OrderCloudSDK.Me.ListProducts({
                            	'search':forThisCustomer.id.substring(0,5),
                            	'searchOn': "ID",
								'page':1,
								'pageSize':20,
                            	'sortBy': "Name",
								'filters':filter[SearchTypeService.GetLastSearchType()][Me.Org.xp.WeirGroup.label].secondary })
							.then(function(altResponse) {
								partResults.push.apply(altResponse.Items);
								//return
                                dfd.resolve(partResults);
							});
					} else {
						//return
					    dfd.resolve(WeirService.SetEnglishTranslationParts(response.Items));
					}
				});
		} else {
            if(SearchTypeService.GetLastSearchType() === "s") {
                //return
				OrderCloudSDK.Me.ListCategories({
						'page':1,
						'pageSize':20,
                    	'sortBy': "Name",
						'filters':filter[SearchTypeService.GetLastSearchType()],
						'depth':"all",
						'catalogID':Me.Org.xp.WeirGroup.label })
                    .then(function (response) {
                        //return
						OrderCloudSDK.Me.ListCategories({
								'search':lookForThisProduct,
								'page':1,
								'pageSize':20,
								'searchOn':"Description",
								'depth':"all",
								'catalogID':Me.Org.xp.WeirGroup.label })
                            .then(function(responseDescription){
                                var returnResults = response.Items.concat(responseDescription.Items);
	                            returnResults = _.filter(returnResults, function(item) { return item.ParentID != null; }); //We do this to get rid of the top level category descriptions.
                                returnResults = _.uniq(returnResults, false, function(cat){return cat.xp.SN});
                                //return
                                dfd.resolve(WeirService.SetEnglishTranslationParts(returnResults));
                            });
                    });
            } else {
                //return
				OrderCloudSDK.Me.ListCategories({
						'page':1,
						'pageSize':20,
						'filters':filter[SearchTypeService.GetLastSearchType()],
						'depth':"all",
                    	'sortBy': "Name",
						'catalogID':Me.Org.xp.WeirGroup.label })
                    .then(function (response) {
                        //return
                        dfd.resolve(WeirService.SetEnglishTranslationParts(response.Items));
                    });
            }
		}

        return dfd.promise;
	}

	return service;
}