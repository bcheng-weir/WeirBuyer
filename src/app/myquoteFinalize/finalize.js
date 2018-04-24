angular.module('orderCloud')
    .service('FinalizeService',FinalizeService)
    .config(FinalizeConfig)
    .controller('FinalizeController',FinalizeController);

function FinalizeService() {
    /*
    * Any specific button clicks from revised, submit and readonly and can be put here in order to clear out the
    * controllers.
    */

    function returnTrue() { return true; }
    var service = {
        something:returnTrue
    };
    return service;
}

function FinalizeConfig($stateProvider) {
    $stateProvider
        .state('finalize', {
            abstract:true,
            parent: 'base',
            url:'/finalize?orderID',
            template:'<ui-view />',
            controller:'FinalizeController',
            controllerAs:'finalize',
            resolve: {
                Order: function ($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.Orders.Get("Outgoing", $stateParams.orderID);
                },
                ShippingAddress: function (Order, OrderCloudSDK, Me) {
                    if (Order.ShippingAddressID) return OrderCloudSDK.Addresses.Get(Me.GetBuyerID(), Order.ShippingAddressID);
                    return null;
                },
                LineItems: function ($q, toastr, OrderCloudSDK, LineItemHelpers, Order, Me, WeirService) {
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "Votre cotation ne contient aucune ligne";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Your quote does not contain any line items";
                        errorTitle = "Error";
                    }
                    var dfd = $q.defer();
                    var lang = Me.Org.xp.Lang ? Me.Org.xp.Lang.id : "";
                    OrderCloudSDK.LineItems.List("Outgoing", Order.ID)
                        .then(function (data) {
                            if (!data.Items.length) {
                                toastr.error(errorMsg, errorTitle);
                                dfd.resolve({ Items: [] });
                            } else {
                                LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
                                LineItemHelpers.GetProductInfo(data.Items)
                                    .then(function () {
                                        if (lang && data.Items) {
                                            for (var i = 0; i < data.Items.length; i++) {
                                                var tmp = data.Items[i];
                                                if (tmp.Product && tmp.Product.xp && tmp.Product.xp[lang]) {
                                                    tmp.Product.Description = tmp.Product.xp["en"].Description || tmp.Product.Description;
                                                }
                                            }
                                        }
                                        dfd.resolve(data);
                                    });
                            }
                        })
                        .catch(function () {
                            toastr.error(errorMsg, errorTitle);
                            dfd.resolve({ Items: [] });
                        });
                    return dfd.promise;
                },
                PreviousLineItems: function($q, toastr, OrderCloudSDK, Order, LineItemHelpers, Me, WeirService) {
                    // We can't have a quantity of 0 on a line item. With show previous line items
                    // Split the current order ID. If a rec exists, get, else do nothing.
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "La cotation précédente ne contient aucune ligne";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Previous quote does not contain any line items";
                        errorTitle = "Error";
                    }
                    var pieces = Order.ID.split('-Rev');
                    if(pieces.length > 1) {
                        var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
                        var dfd = $q.defer();
                        var lang = Me.Org.xp.Lang ? Me.Org.xp.Lang.id : "";
                        OrderCloudSDK.LineItems.List("Outgoing", prevId)
                            .then(function(data) {
                                if (!data.Items.length) {
                                    toastr.error(errorMsg, errorTitle);
                                    dfd.resolve({ Items: [] });
                                } else {
                                    LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
                                    LineItemHelpers.GetProductInfo(data.Items)
                                        .then(function () {
                                            if (lang && data.Items) {
                                                for (var i = 0; i < data.Items.length; i++) {
                                                    var tmp = data.Items[i];
                                                    if (tmp.Product && tmp.Product.xp && tmp.Product.xp[lang]) {
                                                        tmp.Product.Description = tmp.Product.xp["en"].Description || tmp.Product.Description;
                                                    }
                                                }
                                            }
                                            dfd.resolve(data);
                                        });
                                }
                            })
                            .catch(function () {
                                dfd.resolve({ Items: [] });
                            });
                        return dfd.promise;
                    } else {
                        return null;
                    }
                },
                Payments: function ($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.Payments.List("Outgoing", $stateParams.orderID);
                },
                Catalog:  function (OrderCloudSDK, Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    return OrderCloudSDK.Catalogs.Get(Me.Org.xp.WeirGroup.label);
                },
                Buyer : function(OrderCloudSDK, Me){
                    return OrderCloudSDK.Buyers.Get(Me.GetBuyerID());
                },
                Countries: function(OCGeography) {
                    return OCGeography.Countries();
                }
            }
        })
        .state('finalize.revised', {
            parent: 'finalize',
            url: '/revised',
            templateUrl:'myquoteFinalize/templates/finalize.tpl.html'
        })
        .state('finalize.submit', {
            parent: 'finalize',
            url: '/submit',
            templateUrl:'myquoteFinalize/templates/finalize.tpl.html'
        })
        .state('finalize.readonly', {
            parent: 'finalize',
            url: '/readonly',
            templateUrl:'myquoteFinalize/templates/finalize.tpl.html'
        })
}

function FinalizeController($sce, $state, $timeout, $window, $uibModal, $document, $exceptionHandler, OrderCloudSDK,
                            OCGeography, Underscore, toastr, QuoteToCsvService, imageRoot, fileStore, FinalizeService,
                            WeirService, Me, Countries, Catalog, Order, Payments, Buyer, LineItems,
                            PreviousLineItems, ShippingAddress) {
    var vm = this;
    vm.Catalog = Catalog;
    vm.buyer = Me.Org;
    vm.BuyerID = Me.GetBuyerID();
    vm.Payments = Payments.Items;
    var payment = (vm.Payments.length > 0) ? vm.Payments[0] : null;
    if (payment && payment.xp && payment.xp.PONumber) vm.PONumber = payment.xp.PONumber;

    vm.Order = Order;
    vm.LineItems = LineItems ? LineItems.Items : [];
    vm.ShippingAddress = ShippingAddress;
    if(ShippingAddress && ShippingAddress.Country) {
        var temp;
        temp = Underscore.findWhere(Countries, {code: ShippingAddress.Country});
        vm.Order.CountryName = temp ? temp.name : "";
    } else {
        vm.Order.CountryName = "";
    }

    vm.POContent = Me.Org.xp.WeirGroup.id === 2 && WeirService.Locale() === "en" ? Catalog.xp.POContentFR_EN : Catalog.xp.POContent;
    vm.SharedContent = Me.Org.xp.WeirGroup.id === 2 && WeirService.Locale() === "en" ? Catalog.xp.SharedContentFR_EN : Catalog.xp.SharedContent;

    var curr = WeirService.CurrentCurrency(vm.Order);
    vm.currency = curr.symbol;

    vm.CommentsToWeir = Order.xp.CommentsToWeir;
    vm.NewComment = null;
    vm.CarriageRateForBuyer = Buyer.xp.UseCustomCarriageRate === true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
    vm.CarriageRateForBuyer = vm.CarriageRateForBuyer.toFixed(2);
    vm.PONumber = "";

    vm.ImageBaseUrl = imageRoot;
    vm.imgInformation = "../../../assets/images/Information.svg";
    vm.Zero = 0;

    OCGeography.Countries()
        .then(function(countries) {
            vm.countries = countries;
        });
    //ToDO we are duplicating pulling/setting the Quote.Country
    vm.country = function (c) {
        var result = Underscore.findWhere(vm.countries, { code: c });
        vm.Order.CountryName = result ? result.name : '';
        return result ? result.name : '';
    };
    vm.GetFile = function(fileName) {
        var orderid = vm.Order.xp.OriginalOrderID ? vm.Order.xp.OriginalOrderID : vm.Order.ID;
        FilesService.Get(orderid + fileName)
            .then(function(fileData) {
                var file = new Blob([fileData.Body], {type: fileData.ContentType});
                FileSaver.saveAs(file, fileName);
            });
    };

    vm.ShowCommentBox = false;
    vm.CommentToWeir = "";
    vm.fileStore = fileStore;

    function _filterActions(action) {
        var filter = {
            "quotes.all": {
                "xp.Type":"Quote",
                "xp.Active":true
            },
            "quotes.saved": {
                "xp.Type":"Quote",
                "xp.Status":WeirService.OrderStatus.Saved.id+"|"+WeirService.OrderStatus.Draft.id,
                "xp.Active":true
            },
            "quotes.requested": {
                "xp.Type": "Quote",
                "xp.Status":WeirService.OrderStatus.Enquiry.id + "|" + WeirService.OrderStatus.EnquiryReview.id + "|" + WeirService.OrderStatus.Submitted.id + "|" + WeirService.OrderStatus.RevisedQuote.id + "|" + WeirService.OrderStatus.RejectedQuote.id,
                "xp.Active":true
            },
            "quotes.confirmed": {
                "xp.Type":"Quote",
                "xp.Status":WeirService.OrderStatus.ConfirmedQuote.id,
                "xp.Active":true
            },
            "quotes.deleted": {
                "xp.Type":"Quote",
                "xp.Status":WeirService.OrderStatus.Deleted.id
            },
            "orders.all": {
                "xp.Type":"Order",
                "xp.Active":true
            },
            "orders.draft": {
                "xp.Type":"Order",
                "xp.Status":WeirService.OrderStatus.SubmittedPendingPO.id + "|" + WeirService.OrderStatus.RevisedOrder.id + "|" + WeirService.OrderStatus.RejectedRevisedOrder.id + "|" + WeirService.OrderStatus.Despatched.id + "|" + WeirService.OrderStatus.Invoiced.id,
                "xp.Active":true
            },
            "orders.confirmed":{
                "xp.Type":"Order",
                "xp.Status":WeirService.OrderStatus.ConfirmedOrder.id + "|" + WeirService.OrderStatus.SubmittedWithPO.id,
                "xp.Active": true
            },
            "orders.deleted": {
                "xp.Type":"Order",
                "xp.Status":WeirService.OrderStatus.Deleted.id
            }
        };
        return JSON.stringify(filter[action]);
    }

    vm.gotoOrder = function() {
        //Given the current items type and status, know to which list view should be navigated.
        if(vm.Order.xp.Type === "Quote") {
            if([WeirService.OrderStatus.Deleted.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("quotes.deleted", {filters: _filterActions('quotes.deleted')}, {reload: true});
            } else if([WeirService.OrderStatus.ConfirmedQuote.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("quotes.confirmed", {filters: _filterActions('quotes.confirmed')}, {reload: true});
            } else if([WeirService.OrderStatus.Saved.id,WeirService.OrderStatus.Draft.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("quotes.saved", {filters: _filterActions('quotes.saved')}, {reload: true});
            } else if([WeirService.OrderStatus.Enquiry.id,
                    WeirService.OrderStatus.EnquiryReview.id,
                    WeirService.OrderStatus.Submitted.id,
                    WeirService.OrderStatus.RevisedQuote.id,
                    WeirService.OrderStatus.RejectedQuote.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("quotes.requested", {filters: _filterActions('quotes.requested')}, {reload: true});
            } else {
                $state.go("quotes.all", {filters: _filterActions('quotes.all')}, {reload: true});
            }
        } else {
            if([WeirService.OrderStatus.Deleted.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("orders.deleted", {filters: _filterActions('orders.deleted')}, {reload: true});
            } else if([WeirService.OrderStatus.ConfirmedOrder.id,
                    WeirService.OrderStatus.SubmittedWithPO.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("orders.confirmed", {filters: _filterActions('orders.confirmed')}, {reload: true});
            } else if([WeirService.OrderStatus.SubmittedPendingPO.id,
                    WeirService.OrderStatus.RevisedOrder.id,
                    WeirService.OrderStatus.RejectedRevisedOrder.id,
                    WeirService.OrderStatus.Despatched.id,
                    WeirService.OrderStatus.Invoiced.id].indexOf(vm.Order.xp.Status) > -1) {
                $state.go("orders.draft", {filters: _filterActions('orders.draft')}, {reload: true});
            } else {
                $state.go("orders.all", {filters: _filterActions('orders.all')}, {reload: true});
            }
        }
    };

    vm.AddNewComment = function() {
        if(vm.NewComment) {
            var comment = {
                date: new Date(),
                by: Me.Profile.FirstName + " " + Me.Profile.LastName,
                val: vm.NewComment,
                IsWeirComment: false
            };

            if (!vm.Order.xp.CommentsToWeir || Object.prototype.toString.call(vm.Order.xp.CommentsToWeir) !== '[object Array]') {
                vm.Order.xp.CommentsToWeir = [];
            }
            vm.Order.xp.CommentsToWeir.push(comment);

            OrderCloudSDK.Orders.Patch("Outgoing", vm.Order.ID, {xp: {CommentsToWeir: vm.Order.xp.CommentsToWeir}})
                .then(function (order) {
                    vm.NewComment = "";
                    $state.go($state.current, {}, {reload: true});
                })
                .catch(function (ex) {
                    $exceptionHandler(ex);
                })
        } else {
            toastr.info(vm.labels.EmptyComments,vm.labels.EmptyCommentTitle);
        }
    };

    vm.GetStatusLabel = function() {
        if (vm.Order.xp.Status) {
            var status = WeirService.LookupStatus(vm.Order.xp.Status);
            if (status) {
                return status.label[WeirService.Locale()];
                // TODO: Address localization
            }
        }
        return "";
    };

    vm.ToCsvJson = function() {
        var printLabels = angular.copy(vm.labels);
        var printOrder = angular.copy(vm.Order);
        return QuoteToCsvService.ToCsvJson(printOrder, vm.LineItems, vm.ShippingAddress, vm.Payments, printLabels);
    };
    vm.CsvFilename = vm.Order.ID + ".csv";

    vm.GetImageUrl = function(img) {
        return vm.ImageBaseUrl + img;
    };

    vm.Reject = function() {
        if (vm.Order.xp.Status === WeirService.OrderStatus.RevisedQuote.id || vm.Order.xp.Status === WeirService.OrderStatus.RevisedOrder.id) {
            var mods = {
                xp: {
                    StatusDate: new Date(),
                    Status: vm.Order.xp.Type === "Quote" ? WeirService.OrderStatus.RejectedQuote.id : WeirService.OrderStatus.RejectedRevisedOrder.id
                }
            };
            WeirService.UpdateQuote(vm.Order, mods)
                .then(function (qte) {
                    toastr.success(vm.labels.RejectedMessage, vm.labels.RejectedTitle);
                    $state.go('finalize.readonly',
                        {
                            orderID: vm.Order.ID
                        },
                        { reload: true });
                })
                .catch(function(ex) {
                    console.log(ex);
                });
        }
    };

    var labels = {
        en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote Number; ",
            QuoteName: "Quote Name; ",
            BackToQuotes: {
                Quote:"<i class='fa fa-angle-left' aria-hidden='true'></i> Back to your Quotes",
                Order:"<i class='fa fa-angle-left' aria-hidden='true'></i> Back to your Orders"
            },
            SerialNum: "Serial Number",
            TagNum: "Tag Number (if available)",
            PartNum: "Part Number",
            PartDesc: "Description of Part",
            RecRepl: "Recommended Replacement (yrs)",
            LeadTime: "Lead Time / Availability (days)",
            PricePer: "Price per Item",
            Quantity: "Quantity",
            Total: "Total",
            Removed: "Removed",
            Updated: "Updated",
            New: "New",
            YourAttachments: "Your Attachments",
            YourReference: "Your Reference No; ",
            CommentsHeader: "Your Comments or Instructions",
            DeliveryAddress: "Delivery Address",
            ViewRevisions: "View Previous Revisions",
            Save: "Save",
            Share: "Share",
            Download: "Download",
            Print: "Print",
            Approve: {
                Quote:"Approve revised quote <i class='fa fa-angle-right' aria-hidden='true'></i>",
                Order:"Approve revised order <i class='fa fa-angle-right' aria-hidden='true'></i>"
            },
            Reject: "Request revision <i class='fa fa-angle-right' aria-hidden='true'></i>",
            Comments: "Comments",
            Status: "Status",
            OrderDate: "Order Date;",
            ValidUntil: "Valid Until",
            Currency: "Currency",
            RejectedMessage: "The Revised Quote has been Rejected.",
            RejectedTitle: "Quote Updated",
            ApprovedMessage: "The Revised Quote has been Accepted",
            ApprovedTitle: "Quote Updated",
            Comment: "Comment",
            AddedComment: " added a comment - ",
            Add: "Add",
            Cancel: "Cancel",
            PONumber: "PO Number;",
            POA: "POA",
            UpdateFXRate: "Revise with current exchange rate",
            DescriptionOfShipping: {
                exworks:'Carriage - Ex Works',
                standard:'Carriage Charge'
            },
            POAShipping: "POA",
            EmptyComments: $sce.trustAsHtml("Cannot save an empty comment."),
            EmptyCommentTitle: $sce.trustAsHtml("Empty Comment"),
            QuoteTooltip: {
                Quote:$sce.trustAsHtml("If you approve this revised quote you will have the following options;<br><br>1. Submit as Draft Order<br>2. Save as Confirmed Quote<br><small>Your order will be confirmed following receipt or upload of your PO.</small>"),
                Order:$sce.trustAsHtml("If you approve this revised order it will become a Confirmed Order - PO Pending<br><br>1. You can upload your PO to the order at a later date<br>2. You can send Weir your PO and we will upload it for you<br><small>Your order will be confirmed following receipt or upload of your PO.</small>")
            },
            RejectTooltip: $sce.trustAsHtml("Please use the comments area of this page to provide the details of your requested revisions."),
            PartTypes: "Part types for;",
            Brand: "Brand",
            ValveType: "Valve Type",
            DeliveryOptions: "Delivery Options",
            WeirComment: "Comment",
            SubmitWithPO: "Submit Order",
            SubmitOrderAndEmail: "Submit as order pending PO <i class='fa fa-angle-right' aria-hidden='true'></i>",
            SubmitOrderWithPO: "Submit as Order with PO <i class='fa fa-angle-right' aria-hidden='true'></i>",
            EmailPoMessage: "*Your order will be confirmed<br class='message-break'>following receipt of your PO.",
            POEntry: "Enter PO Number",
            DragAndDrop: "Drag and drop Files Here to Upload",
            PONeededHeader: "Please Provide a Purchase Order to Finalise your Order",
            POUpload: "Upload PO Document",
            SubmitWithPOTooltip: $sce.trustAsHtml("You can add your PO to this Confirmed quote and submit as a Confirmed Order - PO added."),
            SubmitPendingPOTooltip: $sce.trustAsHtml("You can approve this confirmed quote and submit as a Confirmed order - pending PO.<br><br>1. You can upload your PO to the order at a later date<br>2. You can send Weir your PO and we will upload it for you<br><small>Your order will be confirmed following receipt of your PO.</small>"),
        },
        fr: {
            Customer: $sce.trustAsHtml("Client "),
            QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("Nom de la cotation "),
            BackToQuotes: {
                Quote:$sce.trustAsHtml("<i class='fa fa-angle-left' aria-hidden='true'></i> Retour &agrave; vos cotations"),
                Order:$sce.trustAsHtml("FR:<i class='fa fa-angle-left' aria-hidden='true'></i> Back to your Orders")
            },
            SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
            TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
            PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
            PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
            RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
            LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
            PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
            Quantity: $sce.trustAsHtml("Quantit&eacute;"),
            Total: $sce.trustAsHtml("Total"),
            Removed: $sce.trustAsHtml("Supprimé"),
            Updated: $sce.trustAsHtml("Modifié"),
            New: $sce.trustAsHtml("Nouveau"),
            YourAttachments: $sce.trustAsHtml("Vos pi&egrave;ces jointes"),
            YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
            ViewRevisions: $sce.trustAsHtml("Voir les r&eacute;visions de commande"),
            Save: $sce.trustAsHtml("Sauvegarder"),
            Share: $sce.trustAsHtml("Partager"),
            Download: $sce.trustAsHtml("T&eacute;l&eacute;charger"),
            Print: $sce.trustAsHtml("Imprimer"),
            Approve: {
                Quote:"FR: Approve revised quote <i class='fa fa-angle-right' aria-hidden='true'></i>",
                Order:"FR: Approve revised order <i class='fa fa-angle-right' aria-hidden='true'></i>"
            },
            Reject: "FR: Request revision <i class='fa fa-angle-right' aria-hidden='true'></i>",
            Comments: $sce.trustAsHtml("Commentaires"),
            Status: $sce.trustAsHtml("Statut"),
            OrderDate: $sce.trustAsHtml("Date de commande"),
            ValidUntil: $sce.trustAsHtml("Valide jusqu'&agrave;"),
            Currency: $sce.trustAsHtml("Devise"),
            RejectedMessage: $sce.trustAsHtml("La cotation révisée a ét&eacute; rejetée."),
            RejectedTitle: $sce.trustAsHtml("Cotation mise &agrave; jour"),
            ApprovedMessage: $sce.trustAsHtml("La cotation révisée a été acceptée"),
            ApprovedTitle: $sce.trustAsHtml("Cotation mise à jour"),
            Comment: $sce.trustAsHtml("Commentaire"),
            AddedComment: $sce.trustAsHtml(" A ajouté un commentaire - "),
            Add: $sce.trustAsHtml("Ajouter"),
            Cancel: $sce.trustAsHtml("Annuler"),
            PONumber: $sce.trustAsHtml("Numéro de bon de commande;"),
            POA: $sce.trustAsHtml("POA"),
            UpdateFXRate: $sce.trustAsHtml("Revise with current exchange rate"),
            DescriptionOfShipping: {
                exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
                standard:$sce.trustAsHtml('Frais de livraison')
            },
            POAShipping: "POA",
            EmptyComments: $sce.trustAsHtml("Impossible d'enregistrer un commentaire vide."),
            EmptyCommentTitle: $sce.trustAsHtml("Commentaire vide"),
            QuoteTooltip: {
                Quote:$sce.trustAsHtml("FR: If you approve this revised quote you will have the following options;<br><br>1. Submit as Draft Order<br>2. Save as Confirmed Quote<br><small>Your order will be confirmed following receipt or upload of your PO.</small>"),
                Order:$sce.trustAsHtml("FR: If you approve this revised order it will become a Confirmed Order - PO Pending<br><br>1. You can upload your PO to the order at a later date<br>2. You can send Weir your PO and we will upload it for you<br><small>Your order will be confirmed following receipt or upload of your PO.</small>")
            },
            RejectTooltip: $sce.trustAsHtml("FR: Please use the comments area of this page to provide the details of your requested revisions"),
            DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
            WeirComment: $sce.trustAsHtml("Commenter"),
            SubmitWithPO: $sce.trustAsHtml("Soumettre une commande avec bon de commande"),
            PartTypes: $sce.trustAsHtml("Pièces pour:"),
            Brand: $sce.trustAsHtml("Marque:"),
            ValveType: $sce.trustAsHtml("Type:"),
            SubmitOrderAndEmail: $sce.trustAsHtml("FR: Submit as order pending PO <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            SubmitOrderWithPO: $sce.trustAsHtml("FR: Submit as Order with PO <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            EmailPoMessage: $sce.trustAsHtml("Votre commande sera confirmée<br class='message-break'>après réception de votre bon de commande."),
            POEntry: $sce.trustAsHtml("Entrer une r&eacute;f&eacute;rence de commande"),
            DragAndDrop: $sce.trustAsHtml("Faites glisser vos documents ici pour les t&eacute;l&eacute;charger"),
            PONeededHeader: $sce.trustAsHtml("Veuillez fournir un bon de commande pour finaliser votre commande"),
            POUpload: $sce.trustAsHtml("T&eacute;l&eacute;charger le bon de commande"),
            SubmitWithPOTooltip: $sce.trustAsHtml("FR: You can add your PO to this Confirmed quote and submit as a Confirmed Order - PO added."),
            SubmitPendingPOTooltip: $sce.trustAsHtml("FR: You can approve this confirmed quote and submit as a Confirmed order - pending PO.<br><br>1. You can upload your PO to the order at a later date<br>2. You can send Weir your PO and we will upload it for you<br><small>Your order will be confirmed following receipt of your PO.</small>"),
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

    /*
    * Submit Functionality:
    */
    vm.submitOrder = function(withPO) {
        if (payment == null) {
            if (vm.PONumber) {
                var data = {
                    Type: "PurchaseOrder",
                    xp: {
                        PONumber: vm.PONumber,
                        POEnteredByWeir: false
                    }
                };
                OrderCloudSDK.Payments.Create("Outgoing", vm.Order.ID, data)
                    .then(function (pmt) {
                        vm.Payments.push(pmt);
                        payment = pmt;
                        completeSubmit(withPO);
                    })
            } else {
                // email the PO later. Can we acutally submit without a PO?
                completeSubmit(withPO);
            }
        } else if (!payment.xp || payment.xp.PONumber != vm.PONumber) {
            var data = {
                xp: {
                    PONumber: vm.PONumber,
                    POEnteredByWeir: false
                }
            };
            OrderCloudSDK.Payments.Patch("Outgoing", vm.Order.ID, payment.ID, data)
                .then(function (pmt) {
                    vm.Payments[0] = pmt;
                    payment = pmt;
                    completeSubmit(withPO);
                })
        } else {
            completeSubmit(withPO);
        }
    };
    function completeSubmit(withPO) {
        var data = {};
        if(withPO) {
            data = {
                xp: {
                    Status: WeirService.OrderStatus.SubmittedWithPO.id,
                    StatusDate: new Date(),
                    Type: "Order",
                    Revised: false,
                    PONumber: vm.PONumber,
                    PendingPO: false,
                    POEnteredByWeir: false
                }
            };
        } else {
            data = {
                xp: {
                    Status: WeirService.OrderStatus.ConfirmedOrder.id,
                    StatusDate: new Date(),
                    Type: "Order",
                    PendingPO: true,
                    PONumber: "Pending",
                    Revised: false
                }
            };
        }
        WeirService.UpdateQuote(vm.Order, data)
            .then(function (info) {
                if(info.xp.Status === WeirService.OrderStatus.ConfirmedOrder.id) {
                    $state.go('finalize.submit', { orderID: vm.Order.ID, buyerID: Me.GetBuyerID() }, {reload: true});
                } else {
                    $state.go('finalize.readonly', { orderID: vm.Order.ID, buyerID: Me.GetBuyerID() }, {reload: true});
                }

                //TODO WHY ARE MY MODALS BREAKING?!?!?!?
                var modalInstance = $uibModal.open({
                    animation: true,
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: 'myquote/templates/myquote.orderplacedconfirm.tpl.html',
                    size: 'lg',
                    controller: 'SubmitConfirmCtrl',
                    controllerAs: 'submitconfirm',
                    resolve: {
                        orderType: function () {
                            return "order";
                        }
                    }
                }).closed.then(function () {
                    //ToDo?
                });
            })
            .catch(function(ex){
                console.log(ex);
            });
    }

    /*
    * Revised Functionality
    */
    function notUpdated(newObj, oldObj) {
        if(typeof newObj !== "undefined" && typeof oldObj !== "undefined" && newObj === oldObj)
        {
            return true;
        }
        else
        {
            if(newObj == oldObj || (!newObj || newObj == 0) && (typeof oldObj === "undefined" || oldObj == null))
            {
                return true;
            }
            else
            {
                return false;
            }
        }
    }
    //Part of the label comparison
    function compare(current,previous) {
        if (notUpdated(current.Quantity, previous.Quantity) &&
            notUpdated(current.UnitPrice, previous.UnitPrice) &&
            notUpdated(current.xp.TagNumber, previous.xp.TagNumber) &&
            notUpdated(current.xp.SN, previous.xp.SN) &&
            (
                notUpdated(current.xp.LeadTime, previous.xp.LeadTime) == false
                || (current.Product && current.Product.xp && notUpdated(current.Product.xp.LeadTime, previous.Product.xp.LeadTime) == false ? false : true)
            ) &&
            (
                (current.Product && current.Product.xp && notUpdated(current.Product.xp.ReplacementSchedule, previous.Product.xp.ReplacementSchedule) == false)
                || notUpdated(current.xp.ReplacementSchedule , previous.xp.ReplacementSchedule) == false ? false : true
            ) &&
            (
                (current.Product && current.Product.xp && notUpdated(current.Product.Description , previous.Product.Description) == false)
                || notUpdated(current.xp.Description , previous.xp.Description) == false ? false : true
            )
            &&
            (
                (current.Product && current.Product.xp && notUpdated(current.Product.Name , previous.Product.Name) == false)
                || notUpdated(current.xp.ProductName , previous.xp.ProductName) == false ? false : true
            )
        )
        {
            return null;
        }
        else {
            return "UPDATED";
        }
    }
    if(LineItems && PreviousLineItems) {
        LineItems = Underscore.filter(LineItems.Items, function(item) {
            var found = false;
            if(item.ProductID == "PLACEHOLDER") { //Match a blank line item
                angular.forEach(PreviousLineItems.Items, function(value, key) {
                    if(value.xp.SN == item.xp.SN) {
                        found = true;
                        item.displayStatus = compare(item,value);
                    }
                });
            } else { // Match regular line items
                angular.forEach(PreviousLineItems.Items, function(value, key) {
                    if(value.ProductID === item.ProductID) {
                        found = true;
                        item.displayStatus = compare(item,value);
                    }
                });
            }

            if(!found) {
                //new!
                item.displayStatus = "NEW";
            }

            return item;
        });
    } else {
        LineItems = null;
    }
    if(LineItems && PreviousLineItems) {
        PreviousLineItems = Underscore.filter(PreviousLineItems.Items, function (item) {
            if(item.ProductID === "PLACEHOLDER") {
                var found = false;
                angular.forEach(LineItems.Items, function(value, key) {
                    if(value.xp.SN === item.xp.SN) {
                        found = true;
                        return;
                    }
                });
                if(found) {
                    return;
                } else {
                    item.displayStatus="DELETED";
                    return item; //Deleted blank line item.
                }
            } else {
                if (Underscore.findWhere(LineItems.Items, {ProductID:item.ProductID})) {
                    return;
                } else {
                    item.displayStatus="DELETED";
                    return item; //Deleted normal line item.
                }
            }
        });
    } else {
        PreviousLineItems = null;
    }
    vm.PreviousLineItems = PreviousLineItems;

    vm.ShowUpdatedShipping = function () {
        if(Order.xp.OldShippingData) {
            if (Order.ShippingCost != Order.xp.OldShippingData.ShippingCost || Order.xp.ShippingDescription != Order.xp.OldShippingData.ShippingDescription) {
                if(Order.xp.WasEnquiry  == true && Order.xp.OldShippingData.ShippingCost === 0 && Order.ShippingCost > 0
                    && Order.xp.OldShippingData.ShippingDescription == null)
                {

                    return false;
                }
                else return true;
            } else {
                return false;
            }
        }
        else {
            return false;
        }
    };

    vm.gotoRevisions = function() {
        if(Order.xp.OriginalOrderID) {
            $state.go("revisions", { quoteID: Quote.xp.OriginalOrderID });
        }
    };

    vm.dateOfValidity = function (utcDate) {
        var date = new Date(utcDate);
        return date.setDate(date.getDate() + 30);
    };
    vm.showUpdateFXRate = function (utcDate) {
        var date = new Date(utcDate);
        date.setDate(date.getDate() + 30);
        return new Date() > date;
    };

    vm.Approve = function() {
        if (vm.Order.xp.Status === WeirService.OrderStatus.RevisedOrder.id) {
            var mods = {
                xp: {
                    StatusDate: new Date(),
                    Status: WeirService.OrderStatus.ConfirmedOrder.id,
                    Type: "Order"
                }
            };
            WeirService.UpdateQuote(vm.Order, mods)
                .then(function (qte) {
                    toastr.success(vm.labels.ApprovedMessage, vm.labels.ApprovedTitle);
                    $state.go('finalize.readonly', { orderID: vm.Order.ID, buyerID: Me.GetBuyerID() }, {reload:true});
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        } else if (vm.Order.xp.Status === WeirService.OrderStatus.RevisedQuote.id) {
            var parentElem = angular.element($document[0].querySelector('body'));
            $uibModal.open({
                animation:true,
                size:'md',
                templateUrl:'myquote/templates/myquote.revisedmodal.tpl.html',
                controller: function($uibModalInstance, $state, Me, Order, WeirService, toastr, $exceptionHandler) {
                    var vm = this;
                    vm.Order = Order;
                    labels = {
                        en: {
                            SubmitOrder:"Submit as Confirmed order - PO pending",
                            SubmitOrderDetails:$sce.trustAsHtml("<p>Submit your order and send us your PO (we’ll add it to the order for you). You can also add your PO to the order at a later date</p>"),
                            ReviewTerms:"Review Terms and Conditions",
                            Continue:"Submit as Confirmed Order<br>- PO pending ",
                            SaveQuote:"Save as confirmed quote",
                            SaveQuoteDetails:"Save to your confirmed quotes list - you can submit as an order at a later date.",
                            ApprovedMessage: "The Revised Quote has been Accepted",
                            ApprovedTitle: "Quote Updated"
                        },
                        fr: {
                            SubmitOrder:$sce.trustAsHtml("Confirmer la commande"),
                            SubmitOrderDetails:$sce.trustAsHtml("FR: <p>Submit your order and send us your PO (we’ll add it to the order for you). You can also add your PO to the order at a later date</p>"),
                            ReviewTerms:$sce.trustAsHtml("Termes et conditions"),
                            Continue:"FR: Submit as Confirmed Order - PO pending ",
                            SaveQuote:$sce.trustAsHtml("Enregistrer sous Cotations Confirmées"),
                            SaveQuoteDetails:$sce.trustAsHtml("Enregistrez dans votre liste de cotations confirmées - vous pouvez soumettre une commande ultérieurement."),
                            ApprovedMessage: $sce.trustAsHtml("La cotation révisée a été acceptée"),
                            ApprovedTitle: $sce.trustAsHtml("Cotation mise à jour")
                        }
                    };
                    vm.labels = WeirService.LocaleResources(labels);
                    vm.goToTerms = function() {
                        $uibModalInstance.close();
                        $state.go('termsandconditions');
                    };
                    vm.close = function() {
                        $uibModalInstance.dismiss();
                    };
                    vm.confirmQuote = function(status) {
                        var mods = {
                            xp: {
                                StatusDate: new Date(),
                                Status: WeirService.OrderStatus[status].id
                            }
                        };
                        WeirService.UpdateQuote(vm.Order, mods)
                            .then(function (qte) {
                                $uibModalInstance.close();
                                toastr.success(vm.labels.ApprovedMessage, vm.labels.ApprovedTitle);
                                $state.go('finalize.submit', { orderID: vm.Order.ID, buyerID: Me.GetBuyerID() }, {reload:true});
                            })
                            .catch(function(ex) {
                                $exceptionHandler(ex);
                            });
                    };
                },
                controllerAs:'revisedModal',
                appendTo:parentElem,
                resolve: {
                    Order: vm.Order
                }
            });
        }
    };

    //TODO update the status to RQ, and coordinate with Tim R. on the new xp property so the correct webhook email is sent.
    vm.updateFXRate = function () {
        $uibModal.open({
            animation: true,
            size: 'lg',
            templateUrl: 'myquote/templates/myquote.currentfxrateconfirm.tpl.html',
            controller: function ($uibModalInstance, $state, Me, WeirService) {
                var vm = this;
                labels = {
                    en: {
                        Title: "",
                        MessageText1: "Thank you. Your request to revise this quote / order with the current exchange rate has been submitted",
                        MessageText2: "We will respond with a revised quote / order as soon as possible.",
                        Close: "Close"
                    },
                    fr: {
                        Title: $sce.trustAsHtml(""),
                        MessageText1: $sce.trustAsHtml("Thank you. Your request to revise this quote / order with the current exchange rate has been submitted"),
                        MessageText2: $sce.trustAsHtml("We will respond with a revised quote / order as soon as possible."),
                        Close: $sce.trustAsHtml("Fermer")
                    }
                };
                vm.labels = WeirService.LocaleResources(labels);
                vm.close = function () {
                    $uibModalInstance.dismiss();
                };
            },
            controllerAs: 'fxrateconfirm'
        });
    };

}
