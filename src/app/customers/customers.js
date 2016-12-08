angular.module('orderCloud')
    .config(CustomerConfig)
    .factory('CustomerService', CustomerService)
    .controller('CustomerCtrl', CustomerCtrl)
    .controller('CustomerEditCtrl', CustomerEditCtrl)
    .controller('CustomerAddressEditCtrl', CustomerAddressEditCtrl)
    .controller('CustomerCreateCtrl', CustomerCreateCtrl)
    .controller('CustomerAddressCreateCtrl', CustomerAddressCreateCtrl)
    .controller('CustomerAssignCtrl', CustomerAssignCtrl)
;

function CustomerConfig($stateProvider) {
    $stateProvider
        .state('customers', {
            parent: 'base',
            templateUrl: 'customers/templates/customers.tpl.html',
            controller: 'CustomerCtrl',
            controllerAs: 'customers',
            url: '/customers?search&page&pageSize',
            data: {componentName: 'Customers'},
            resolve: {
                Parameters: function($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
                BuyerList: function(OrderCloud, Parameters) {
                    return OrderCloud.Buyers.List(Parameters.search, Parameters.page, Parameters.pageSize);
                }
            }
        })
        .state('customers.edit', {
            url: '/:buyerid/edit?search&page&pageSize&searchOn&sortBy&filters',
            templateUrl: 'customers/templates/customerEdit.tpl.html',
            controller: 'CustomerEditCtrl',
            controllerAs: 'customerEdit',
            resolve: {
                SelectedBuyer: function($stateParams, OrderCloud){
                    return OrderCloud.Buyers.Get($stateParams.buyerid);
                },
                AddressList: function(OrderCloud, $stateParams, Parameters) {
                    var f = {
                        "xp.active":"true"
                    };
                    return OrderCloud.Addresses.List(Parameters.search,Parameters.page,Parameters.pageSize,Parameters.searchOn,Parameters.sortBy,f,$stateParams.buyerid);
                }
            }
        })
        .state('customers.edit.addressEdit', {
            url: '/:buyerid/edit/:addressid',
            templateUrl: 'customers/templates/addressEdit.tpl.html',
            controller: 'CustomerAddressEditCtrl',
            controllerAs: 'customerAddressEdit',
            resolve: {
                SelectedBuyer: function($stateParams, OrderCloud){
                    return OrderCloud.Buyers.Get($stateParams.buyerid)
                },
                SelectedAddress: function($stateParams, $state, OrderCloud) {
                    return OrderCloud.Addresses.Get($stateParams.addressid,$stateParams.buyerid).catch(function() {
                        console.writeline("failed to get address");
                    });
                }
            }
        })
        .state('customers.edit.addressCreate', {
            url: '/:buyerid/edit/address/create',
            templateUrl: 'customers/templates/addressCreate.tpl.html',
            controller: 'CustomerAddressCreateCtrl',
            controllerAs:'customerAddressCreate',
            resolve: {
                SelectedBuyer: function($stateParams, OrderCloud) {
                    return OrderCloud.Buyers.Get($stateParams.buyerid);
                }
            }
        })
        .state('customers.create', {
            url: '/create',
            templateUrl: 'customers/templates/customerCreate.tpl.html',
            controller: 'CustomerCreateCtrl',
            controllerAs: 'customerCreate'
        })
        .state('customers.assign', {
            url: '/:buyerid/assign',
            templateUrl: 'customers/templates/customerAssign.tpl.html',
            controller: 'CustomerAssignCtrl',
            controllerAs: 'customerAssign',
            resolve: {
                SelectedBuyer: function($stateParams, OrderCloud) {
                    return OrderCloud.Buyers.Get($stateParams.buyerid);
                },
                EndUsers: function($stateParams, OrderCloud) {
                    return OrderCloud.Buyers.List();
                }
            }
        });
}

function CustomerService($q, $state, $sce, OrderCloud, $exceptionHandler) {
    var _weirGroups = [{id: "1", label: "WCVUK"}, {id: "2", label: "WPIFR"}];
    var _customerTypes = [{id: "1", label: "End User"}, {id: "2", label: "Service Company"}];
    var _componentLabels = {
        en: {
            NewCustomer: "New Customer",
            WeirGroup: "Weir Group",
            CustomerType: "Customer Type",
            SelectGroup: "(Select Weir Group)",
            SelectType: "(Select Customer Type)",
            Active: "Active",
            Terms: "Terms and Conditions",
            ShippingDetails: "Shipping Details",
            NewAddress: "New Address",
            AddressId:"Address ID",
            AddressName:"Address Name",
            CompanyName:"Company Name",
            FirstName:"First Name",
            LastName:"Last Name",
            StreetOne: "Street 1",
            StreetTwo: "Street 2",
            City: "City",
            County: "County",
            PostCode: "Post Code",
            Country: "Country",
            PhoneNumber: "Phone Number",
            Primary: "Primary",
            Save: "Save",
            Cancel: "Cancel",
            Edit: "Edit",
            EditAddress: "Edit Address",
            SetInactive: "Set as Inactive",
            AssignmentsFor: "Assignments for",
            ID: "ID",
            Name: "Name",
            Back: "Back",
            UpdateAssignments: "Update Assignments",
            EditCustomer: "Edit Customer",
            CreateNew: "Create New",
            Address: "Address",
            Addresses: "Addresses",
            NoMatch: "No matches found.",
            LoadMore: "Load More",
            Customers: "Customers",
            Search: "Search",
            Yes: "Yes",
            No: "No"
        },
        fr: {
            NewCustomer: $sce.trustAsHtml("FR: New Customer"),
            WeirGroup: $sce.trustAsHtml("FR: Weir Group"),
            CustomerType: $sce.trustAsHtml("FR: Customer Type"),
            SelectGroup: $sce.trustAsHtml("FR: (Select Weir Group)"),
            SelectType: $sce.trustAsHtml("FR: (Select Customer Type)"),
            Active: $sce.trustAsHtml("FR: Active"),
            Terms: $sce.trustAsHtml("FR: Terms and Conditions"),
            ShippingDetails: $sce.trustAsHtml("FR: Shipping Details"),
            NewAddress: $sce.trustAsHtml("FR: New Address"),
            AddressId: $sce.trustAsHtml("FR: Address ID"),
            AddressName: $sce.trustAsHtml("FR: Address Name"),
            CompanyName: $sce.trustAsHtml("FR: Company Name"),
            FirstName: $sce.trustAsHtml("FR: First Name"),
            LastName: $sce.trustAsHtml("FR: Last Name"),
            StreetOne: $sce.trustAsHtml("FR: Street 1"),
            StreetTwo: $sce.trustAsHtml("FR: Street 2"),
            City: $sce.trustAsHtml("FR: City"),
            County: $sce.trustAsHtml("FR: County"),
            PostCode: $sce.trustAsHtml("FR: Post Code"),
            Country: $sce.trustAsHtml("FR: Country"),
            PhoneNumber: $sce.trustAsHtml("FR: Phone Number"),
            Primary: $sce.trustAsHtml("FR: Primary"),
            Save: $sce.trustAsHtml("FR: Save"),
            Cancel: $sce.trustAsHtml("FR: Cancel"),
            Edit: $sce.trustAsHtml("FR: Edit"),
            EditAddress: $sce.trustAsHtml("FR: Edit Address"),
            SetInactive: $sce.trustAsHtml("FR: Set as Inactive"),
            AssignmentsFor: $sce.trustAsHtml("FR: Assignments for"),
            ID: $sce.trustAsHtml("FR: ID"),
            Name: $sce.trustAsHtml("FR: Name"),
            Back: $sce.trustAsHtml("FR: Back"),
            UpdateAssignments: $sce.trustAsHtml("FR: Update Assignments"),
            EditCustomer: $sce.trustAsHtml("FR: Edit Customer"),
            CreateNew: $sce.trustAsHtml("FR: Create New"),
            Address: $sce.trustAsHtml("FR: Address"),
            Addresses: $sce.trustAsHtml("FR: Addresses"),
            NoMatch: $sce.trustAsHtml("FR: No matches found."),
            LoadMore: $sce.trustAsHtml("FR: Load More"),
            Customers: $sce.trustAsHtml("FR: Customers"),
            Search: $sce.trustAsHtml("FR: Search"),
            Yes: $sce.trustAsHtml("FR: Yes"),
            No: $sce.trustAsHtml("FR: No")
        }
    };

    function _createBuyer(buyer) {
        return OrderCloud.Buyers.Create(buyer)
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }

    function _createAddress(address, buyerID){
        return OrderCloud.Addresses.Create(address, buyerID)
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }

    function _updateAddress(address, buyerID) {
        return OrderCloud.Addresses.Update(address.ID, address, buyerID)
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }

    return {
        WeirGroups: _weirGroups,
        CustomerTypes: _customerTypes,
        CreateBuyer: _createBuyer,
        CreateAddress: _createAddress,
        UpdateAddress: _updateAddress,
        Labels: _componentLabels
    };
}

function CustomerCtrl($state, $ocMedia, OrderCloud, OrderCloudParameters, Parameters, BuyerList, CustomerService, WeirService) {
    var vm = this;
    vm.list = BuyerList;
    vm.parameters = Parameters;
    vm.sortSelection =  Parameters.sortBy ? (Parameters.sortBy.indexOf('!') == 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;
    vm.labels = CustomerService.Labels[WeirService.Locale()];

    //check if filters are applied
    vm.filtersApplied = vm.parameters.filters || ($ocMedia('max-width:767px') && vm.sortSelection); //Sort by is a filter on mobile devices
    vm.showFilters = vm.filtersApplied;

    //check if search was used
    vm.searchResults = Parameters.search && Parameters.search.length > 0; //Why parameters instead of vm.parameters?

    //Reload the state with new parameters
    vm.filter = function(resetPage) {
        $state.go('.', OrderCloudParameters.Create(vm.parameters, resetPage));
    };

    //Reload the page with new search parameter & reset the page.
    vm.search = function() {
        vm.filter(true);
    };

    //Clear the search parameter, reload the state and reset the page
    vm.clearSearch = function() {
        vm.parameters.search = null;
        vm.filter(true);
    };

    //Clear the relevant filters, reload the state and reset the page
    vm.clearFilters = function() {
        vm.parameters.filters = null;
        $ocMedia('max-width:767px') ? vm.parameters.sortBy = null : angular.noop(); //Clear out sort by on mobile devices.
        vm.filter(true);
    };

    //Conditionally set, reverse, remove the sortBy parameter & reload the state.
    vm.updateSort = function(value) {
        value ? angular.noop() : value = vm.sortSelection;
        switch(vm.parameters.sortBy) {
            case value:
                vm.parameters.sortBy = '!' + value;
                break;
            case '!' + value:
                vm.parameters.sortBy = null;
                break;
            default:
                vm.parameters.sortBy = value;
        }
        vm.filter(false);
    };

    //used on mobile devices
    vm.reverseSort = function() {
        Parameters.sortBy.indexOf('!') == 0 ? vm.parameters.sortBy = Parameters.sortBy.split('!')[1] : vm.parameters.sortBy = '!' + Parameters.sortBy;
        vm.filter(false);
    };

    //Reload the state with the incremented page parameter
    vm.pageChanged = function() {
        $state.go('.', {page:vm.list.Meta.Page});
    };

    //Load the next page of results with all of the same parameters.
    vm.loadMore = function() {
        return OrderCloud.Buyers.List(Parameters.search, vm.list.Meta.Page + 1, parameters.pageSize || vm.list.Meta.PageSize, Parameters.searchOn, Parameters.sortBy, Parameters.filters)
            .then(function(data) {
                vm.list.Items = vm.list.Items.concat(data.Items);
                vm.list.Meta = data.Meta;
            });
    };
}

function CustomerEditCtrl($exceptionHandler, $scope, $state, $ocMedia, toastr, OrderCloud, SelectedBuyer, AddressList, CustomerService, Parameters, Underscore, OrderCloudParameters, WeirService) {
    var vm = this;
    $scope.$state = $state;
    vm.buyer = SelectedBuyer;
    vm.list = AddressList;
    vm.parameters = Parameters;
    vm.labels = CustomerService.Labels[WeirService.Locale()];
    vm.sortSelection =  Parameters.sortBy ? (Parameters.sortBy.indexOf('!') == 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;

    //check if filters are applied
    vm.filtersApplied = vm.parameters.filters || ($ocMedia('max-width:767px') && vm.sortSelection); //Sort by is a filter on mobile devices
    vm.showFilters = vm.filtersApplied;

    //check if search was used
    vm.searchResults = Parameters.search && Parameters.search.length > 0; //Why parameters instead of vm.parameters?

    //Reload the state with new parameters
    vm.filter = function(resetPage) {
        $state.go('.', OrderCloudParameters.Create(vm.parameters, resetPage));
    };

    //Reload the page with new search parameter & reset the page.
    vm.search = function() {
        vm.filter(true);
    };

    //Clear the search parameter, reload the state and reset the page
    vm.clearSearch = function() {
        vm.parameters.search = null;
        vm.filter(true);
    };

    //Clear the relevant filters, reload the state and reset the page
    vm.clearFilters = function() {
        vm.parameters.filters = null;
        $ocMedia('max-width:767px') ? vm.parameters.sortBy = null : angular.noop(); //Clear out sort by on mobile devices.
        vm.filter(true);
    };

    //Conditionally set, reverse, remove the sortBy parameter & reload the state.
    vm.updateSort = function(value) {
        value ? angular.noop() : value = vm.sortSelection;
        switch(vm.parameters.sortBy) {
            case value:
                vm.parameters.sortBy = '!' + value;
                break;
            case '!' + value:
                vm.parameters.sortBy = null;
                break;
            default:
                vm.parameters.sortBy = value;
        }
        vm.filter(false);
    };

    //used on mobile devices
    vm.reverseSort = function() {
        Parameters.sortBy.indexOf('!') == 0 ? vm.parameters.sortBy = Parameters.sortBy.split('!')[1] : vm.parameters.sortBy = '!' + Parameters.sortBy;
        vm.filter(false);
    };

    //Reload the state with the incremented page parameter
    vm.pageChanged = function() {
        $state.go('.', {page:vm.list.Meta.Page});
    };

    //Load the next page of results with all of the same parameters.
    vm.loadMore = function() {
        return OrderCloud.Buyers.List(Parameters.search, vm.list.Meta.Page + 1, parameters.pageSize || vm.list.Meta.PageSize, Parameters.searchOn, Parameters.sortBy, Parameters.filters)
            .then(function(data) {
                vm.list.Items = vm.list.Items.concat(data.Items);
                vm.list.Meta = data.Meta;
            });
    };

    vm.buyerName = SelectedBuyer.Name;
    vm.WeirGroups = CustomerService.WeirGroups;
    vm.types = CustomerService.CustomerTypes;

    vm.Submit = function() {
        OrderCloud.Buyers.Update(vm.buyer, SelectedBuyer.ID)
            .then(function() {
                $state.go('customers', {}, {reload: true});
                toastr.success('Buyer Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };

    vm.checkForPrimary = function() {
        var primaryAddress = Underscore.find(vm.list.Items, function(item) {
            return item.xp.primary == true;
        });

        if(!primaryAddress || primaryAddress.length < 1) {
            return true;
        } else {
            return false;
        }
    }
}

function CustomerCreateCtrl($q, $exceptionHandler, $scope, $state, toastr, OrderCloud, CustomerService, OCGeography, WeirService) {
    var vm = this;
    vm.WeirGroups = CustomerService.WeirGroups;
    vm.types = CustomerService.CustomerTypes;
    vm.countries = OCGeography.Countries;
    vm.states = OCGeography.States;
    vm.labels = CustomerService.Labels[WeirService.Locale()];
    vm.Submit = _submit;

    function _submit() {
        var queue = [];
        var dfd = $q.defer();
        var newBuyerID = null;
        vm.address.xp = {};
        vm.address.xp.primary = true;
        vm.address.xp.active = true;
        vm.buyer.xp.Assignments = [];

        var buyerPromise = CustomerService.CreateBuyer(vm.buyer);
        var addressPromise = buyerPromise.then(function(newBuyer) {
            newBuyerID = newBuyer.ID;
            return CustomerService.CreateAddress(vm.address, newBuyerID)
        });

        queue.push(buyerPromise);
        queue.push(addressPromise);

        $q.all(queue).then(function() {
            dfd.resolve();
            $state.go('customers.edit', {"buyerid": newBuyerID}, {reload: true});
            toastr.success('Records Created', 'Success');
        });

        return dfd.promise;
    }
}

function CustomerAddressEditCtrl($q, $exceptionHandler, $state, $scope, toastr, OrderCloud, OCGeography, SelectedBuyer, SelectedAddress, Underscore, WeirService, CustomerService) {
    var vm = this,
        addressID = SelectedAddress.ID;
    vm.addressName = SelectedAddress.AddressName;
    vm.address = SelectedAddress;
    vm.countries = OCGeography.Countries;
    vm.states = OCGeography.States;
    vm.labels = CustomerService.Labels[WeirService.Locale()];
    var original = angular.copy(vm.address); //use this to make the copy if there are dirty items. Set the active to false and primary to false if versioning.

    vm.Submit = _submit;

    function _submit() {
        // Determine what has changed. If only xp.primary is changed do NOT version.
        var dirtyItems = [];
        angular.forEach($scope.AddressEditForm, function(value, key) {
            if(key[0] != '$' && value.$pristine == false) {
                this.push(key);
            }
        }, dirtyItems);

        original.xp = typeof original.xp == "undefined" ? {} : original.xp;
        original.xp.primary = false;
        original.xp.active = false;

        var primaryAddress = null;
        if(Underscore.contains(dirtyItems,"addressPrimaryInput") && vm.address.xp && vm.address.xp.primary == true && dirtyItems.length == 1) {
            OrderCloud.Addresses.List(null,null,null,null,null,null,SelectedBuyer.ID)
                .then(function(resp) {
                    primaryAddress = Underscore.find(resp.Items,function(item) {
                        return item.xp.primary == true;
                    });
                    if (primaryAddress && (primaryAddress.ID !== vm.address.ID)) {
                        primaryAddress.xp.primary = false;
                        return OrderCloud.Addresses.Patch(primaryAddress.ID, primaryAddress, SelectedBuyer.ID)
                            .then(toastr.success("Previous primary address unset.","Primary Address Changed"));
                    } else {
                        return resp;
                    }
                })
                .then(function(resp) {
                    return OrderCloud.Addresses.Update(addressID, vm.address, SelectedBuyer.ID)
                })
                .then(function(resp) {
                    $state.go('customers.edit', {"buyerid": SelectedBuyer.ID}, {reload: true});
                    toastr.success('Address Updated','Success');
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        } else if (Underscore.contains(dirtyItems,"addressPrimaryInput") && vm.address.xp && vm.address.xp.primary == true && dirtyItems.length > 1) { //Address updated, but primary is false.
            OrderCloud.Addresses.List(null, null, null, null, null, null, SelectedBuyer.ID)
                .then(function (resp) {
                    primaryAddress = Underscore.find(resp.Items, function (item) {
                        return item.xp.primary == true;
                    });
                    if (primaryAddress && (primaryAddress.ID !== vm.address.ID)) {
                        primaryAddress.xp.primary = false;
                        return OrderCloud.Addresses.Patch(primaryAddress.ID, primaryAddress, SelectedBuyer.ID)
                            .then(toastr.success("Previous primary address unset.", "Primary Address Changed"));
                    } else {
                        return resp;
                    }
                })
                .then(function (resp) {
                    return OrderCloud.Addresses.Update(original.ID, original, SelectedBuyer.ID)
                })
                .then(function (resp) {
                    vm.address.ID = null;
                    vm.address.xp = typeof vm.address.xp == "undefined" ? {} : vm.address.xp;
                    vm.address.xp.active = true;
                    vm.address.xp.primary = typeof vm.address.xp.primary == "undefined" ? false : vm.address.xp.primary;
                    return OrderCloud.Addresses.Create(vm.address, SelectedBuyer.ID);
                })
                .then(function (resp) {
                    $state.go('customers.edit', {"buyerid": SelectedBuyer.ID}, {reload: true});
                    toastr.success('Address Updated', 'Success');
                })
                .catch(function (ex) {
                    $exceptionHandler(ex);
                });
        } else if (Underscore.contains(dirtyItems,"addressPrimaryInput") && dirtyItems.length == 1) {
            OrderCloud.Addresses.Update(vm.address.ID, vm.address, SelectedBuyer.ID)
                .then(function() {
                    $state.go('customers.edit', {"buyerid": SelectedBuyer.ID}, {reload: true});
                    toastr.success('Address Updated','Success');
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        } else if (dirtyItems.length > 0) {
            OrderCloud.Addresses.Update(original.ID, original, SelectedBuyer.ID)
                .then(function(resp) {
                    vm.address.ID = null;
                    return OrderCloud.Addresses.Create(vm.address,SelectedBuyer.ID);
                })
                .then(function() {
                    $state.go('customers.edit', {"buyerid": SelectedBuyer.ID}, {reload: true});
                    toastr.success('Address Updated','Success');
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        }
    }

    vm.Delete = function() {
        vm.address.xp = typeof vm.address.xp === "undefined" ? {} : vm.address.xp;
        vm.address.xp.active = false;

        OrderCloud.Addresses.Update(addressID, vm.address, SelectedBuyer.ID)
            .then(function() {
                $state.go('customers.edit', {"buyerid":SelectedBuyer.ID}, {reload: true});
                toastr.success('Address made inactive.', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };
}

function CustomerAddressCreateCtrl($q, $exceptionHandler, $scope, $state, toastr, OrderCloud, OCGeography, CustomerService, SelectedBuyer, Underscore, WeirService) {
    var vm = this;
    vm.countries = OCGeography.Countries;
    vm.states = OCGeography.States;
    vm.address = {Country: null};
    vm.labels = CustomerService.Labels[WeirService.Locale()];
    vm.address.xp = {};
    vm.address.xp.active = true;
    vm.Submit = _submit;

    function _submit() {
        var primaryAddress = null;
        if(vm.address.xp && (vm.address.xp.primary === true)) {
            OrderCloud.Addresses.List(null,null,null,null,null,null,SelectedBuyer.ID)
                .then(function(resp) {
                    primaryAddress = Underscore.find(resp.Items,function(item) {
                        return item.xp.primary == true;
                    });
                    if (primaryAddress && (primaryAddress.ID !== vm.address.ID)) {
                        primaryAddress.xp.primary = false;
                        return OrderCloud.Addresses.Patch(primaryAddress.ID, primaryAddress, SelectedBuyer.ID)
                            .then(toastr.success("Previous primary address unset.","Primary Address Changed"));
                    } else {
                        return resp;
                    }
                })
                .then(function() {
                    return CustomerService.CreateAddress(vm.address, SelectedBuyer.ID);
                })
                .then(function(newAddress) {
                    return WeirService.AssignAddressToGroups(newAddress.ID); //ToDo Test.
                })
                .then(function(resp) {
                    $state.go('customers.edit', {"buyerid": SelectedBuyer.ID}, {reload: true});
                    toastr.success('Address Created', 'Success');
                    return resp;
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        } else {
            vm.address.xp.primary = false;
            CustomerService.CreateAddress(vm.address, SelectedBuyer.ID)
	            .then(function(newAddress) {
		            return WeirService.AssignAddressToGroups(newAddress.ID);
	            })
                .then(function(resp) {
                    $state.go('customers.edit', {"buyerid": SelectedBuyer.ID}, {reload: true});
                    toastr.success('Address Created', 'Success');
                    return resp;
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        }
    }
}

function CustomerAssignCtrl($q, $exceptionHandler, $scope, $state, toastr, Underscore, OrderCloud, SelectedBuyer, EndUsers, Assignments, WeirService, CustomerService) {
    var vm = this;
    vm.list = angular.copy(EndUsers);
    vm.endUsers = angular.copy(EndUsers);
    vm.assignments = angular.copy(SelectedBuyer.xp.Customers);
    vm.serviceCompany = SelectedBuyer;
    vm.labels = CustomerService.Labels[WeirService.Locale()];
    EndUsers.Items = Underscore.filter(EndUsers.Items, function(item) {
        return item.Active == true && item.xp.Type.id == 1 && item.xp.WeirGroup.id == vm.serviceCompany.xp.WeirGroup.id;
    });

    $scope.$watchCollection(function() {
        return vm.list;
    }, function() {
        vm.endUsers.Items = Underscore.filter(vm.list.Items, function(item) {
            return item.Active == true && item.xp.Type.id == 1 && item.xp.WeirGroup.id == vm.serviceCompany.xp.WeirGroup.id;
        });
        setSelected();
    });

    vm.setSelected = setSelected;
    function setSelected() {
        var assigned = Assignments.GetAssigned(vm.assignments, 'id');
        angular.forEach(vm.list.Items, function(item) {
            if(assigned.indexOf(item.ID) > -1) {
                item.selected = true;
            }
        })
    }

    vm.saveAssignments = function() {
        var assigned = Underscore.pluck(vm.assignments, 'id');
        var selected = Underscore.pluck(Underscore.where(vm.list.Items, {selected: true}), 'ID');
        var toAdd = Assignments.GetToAssign(vm.list.Items, vm.assignments, 'ID');
        var toUpdate = Underscore.intersection(selected,assigned);
        var toDelete = Assignments.GetToDelete(vm.list.Items,vm.assignments,'id');

        vm.assignments = [];

        angular.forEach(EndUsers.Items, function(Item) {
            if(toAdd.indexOf(Item.ID) > -1) {
                vm.assignments.push({"id":Item.ID,"name":Item.Name});
            } else if(assigned.indexOf(Item.ID) > -1) {
                vm.assignments.push({"id":Item.ID,"name":Item.Name});
            }
        });

        angular.forEach(toDelete, function(value) {
            var elementPosition = vm.assignments.map(function(x) {return x.id;}).indexOf(value);
            vm.assignments.splice(elementPosition, 1);
        });

        vm.serviceCompany.xp.Customers = vm.assignments;

        return OrderCloud.Buyers.Patch(vm.serviceCompany, vm.serviceCompany.ID)
            .then(function() {
                $state.reload($state.current);
                toastr.success('Assignments updated.','Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };
}