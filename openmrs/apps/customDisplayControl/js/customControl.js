'use strict';

angular.module('bahmni.common.displaycontrol.custom')
    .directive('birthCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
            var link = function ($scope) {
                console.log("inside birth certificate");
                var conceptNames = ["HEIGHT"];
                $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/birthCertificate.html";
                spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                    $scope.observations = response.data;
                }));
            };

            return {
                restrict: 'E',
                template: '<ng-include src="contentUrl"/>',
                link: link
            }
            
        }]).directive('notificacionGes', ['$window', 'appService','$cookies', function ($window, appService, $cookies) {
            var link = function ($scope) {
                $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/notificacionGES.html";
    
                $scope.user_cookie = $cookies.get('bahmni.user');
                
                console.log($scope);
    
                // Obtener la dirección IP del host
                var hostfrontend = $window.location.host + '/notificacion';
                var hostbackend = $window.location.host + '/apinotificacion';
    
                fetch('http://' + hostbackend + '/ges?patientidentifier=' + $scope.patient.identifier)
                //fetch('http://127.0.0.1:5001/ges?patientidentifier=' + $scope.patient.identifier)
                    .then(response => response.json())
                    .then(data => {
                        $scope.notificaciones = data;
                        console.log(data);
                    })
                    .catch(error => console.error(error));
    
                $scope.descartarNotificacion = function (id) {
                    console.log("descartar notificacion" + id);
    
                    //actualizar estado de la notificacion con put a la api enviando el id de la notificacion y el estado DESCARTADO
                    fetch('http://' + hostbackend + '/ges/' + id + '/D?practitioner=' + $scope.user_cookie, {
                    //fetch('http://127.0.0.1:5001/ges/' + id + '/D?practitioner=' + $scope.user_cookie, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            console.log('Descartar Success:', data);
    
                            //actualizar contenido del template
                            fetch('http://' + hostbackend + '/ges?patientidentifier=' + $scope.patient.identifier)
                            //fetch('http://127.0.0.1:5001/ges?patientidentifier=' + $scope.patient.identifier)
                                .then(response => response.json())
                                .then(data => {
                                    $scope.$evalAsync(function () {
                                        $scope.notificaciones = data;
                                        console.log(data);
                                    });
                                })
                                .catch(error => console.error(error));
                        })
                        .catch((error) => {
                            console.error('Error:', error);
                        });
    
                }
    
                $scope.Notificar = function (id) {
                    console.log("Notificar:" + id);
                    //Abre el formulario para notificar en una nueva ventana del navegador
                    //agregar en url el prestador desde el scope
                    //$window.open('http://127.0.0.1:5000/notificacionges/' + id+'?practitioner=' + $scope.user_cookie);
                    $window.open('http://' + hostfrontend + '/notificacionges/' + id+'?practitioner=' + $scope.user_cookie);
    
                    // + '&practitioner=' + $scope.practitioner.uuid);
    
                }
                $scope.VerNotificaciom = function (id) {
                    console.log("Ver:" + id);
                    //Abre el formulario para ver la notificacion en una nueva ventana del navegador
                    //agregar en url el prestador desde el scope
                    $window.open('http://' + hostfrontend + '/vernotificacionges/' + id);
                    //$window.open('http://127.0.0.1:5000/vernotificacionges/' + id);
                }
            }
            
            return {
                restrict: 'E',
                link: link,
                scope: {
                    patient: "=",
                    section: "=",
                    config: "="
                },
                template: '<ng-include src="contentUrl"/>'
            }

    }]).directive('deathCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
        var link = function ($scope) {
            var conceptNames = ["WEIGHT"];
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/deathCertificate.html";
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data;
            }));
        };

        return {
            restrict: 'E',
            link: link,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('customTreatmentChart', ['appService', 'treatmentConfig', 'TreatmentService', 'spinner', '$q', function (appService, treatmentConfig, treatmentService, spinner, $q) {
    var link = function ($scope) {
        var Constants = Bahmni.Clinical.Constants;
        var days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/customTreatmentChart.html";

        $scope.atLeastOneDrugForDay = function (day) {
            var atLeastOneDrugForDay = false;
            $scope.ipdDrugOrders.getIPDDrugs().forEach(function (drug) {
                if (drug.isActiveOnDate(day.date)) {
                    atLeastOneDrugForDay = true;
                }
            });
            return atLeastOneDrugForDay;
        };

        $scope.getVisitStopDateTime = function () {
            return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
        };

        $scope.getStatusOnDate = function (drug, date) {
            var activeDrugOrders = _.filter(drug.orders, function (order) {
                if ($scope.config.frequenciesToBeHandled.indexOf(order.getFrequency()) !== -1) {
                    return getStatusBasedOnFrequency(order, date);
                } else {
                    return drug.getStatusOnDate(date) === 'active';
                }
            });
            if (activeDrugOrders.length === 0) {
                return 'inactive';
            }
            if (_.every(activeDrugOrders, function (order) {
                    return order.getStatusOnDate(date) === 'stopped';
                })) {
                return 'stopped';
            }
            return 'active';
        };

        var getStatusBasedOnFrequency = function (order, date) {
            var activeBetweenDate = order.isActiveOnDate(date);
            var frequencies = order.getFrequency().split(",").map(function (day) {
                return day.trim();
            });
            var dayNumber = moment(date).day();
            return activeBetweenDate && frequencies.indexOf(days[dayNumber]) !== -1;
        };

        var init = function () {
            var getToDate = function () {
                return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
            };

            var programConfig = appService.getAppDescriptor().getConfigValue("program") || {};

            var startDate = null, endDate = null, getEffectiveOrdersOnly = false;
            if (programConfig.showDetailsWithinDateRange) {
                startDate = $stateParams.dateEnrolled;
                endDate = $stateParams.dateCompleted;
                if (startDate || endDate) {
                    $scope.config.showOtherActive = false;
                }
                getEffectiveOrdersOnly = true;
            }

            return $q.all([treatmentConfig(), treatmentService.getPrescribedAndActiveDrugOrders($scope.config.patientUuid, $scope.config.numberOfVisits,
                $scope.config.showOtherActive, $scope.config.visitUuids || [], startDate, endDate, getEffectiveOrdersOnly)])
                .then(function (results) {
                    var config = results[0];
                    var drugOrderResponse = results[1].data;
                    var createDrugOrderViewModel = function (drugOrder) {
                        return Bahmni.Clinical.DrugOrderViewModel.createFromContract(drugOrder, config);
                    };
                    for (var key in drugOrderResponse) {
                        drugOrderResponse[key] = drugOrderResponse[key].map(createDrugOrderViewModel);
                    }

                    var groupedByVisit = _.groupBy(drugOrderResponse.visitDrugOrders, function (drugOrder) {
                        return drugOrder.visit.startDateTime;
                    });
                    var treatmentSections = [];

                    for (var key in groupedByVisit) {
                        var values = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(groupedByVisit[key]);
                        treatmentSections.push({visitDate: key, drugOrders: values});
                    }
                    if (!_.isEmpty(drugOrderResponse[Constants.otherActiveDrugOrders])) {
                        var mergedOtherActiveDrugOrders = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(drugOrderResponse[Constants.otherActiveDrugOrders]);
                        treatmentSections.push({
                            visitDate: Constants.otherActiveDrugOrders,
                            drugOrders: mergedOtherActiveDrugOrders
                        });
                    }
                    $scope.treatmentSections = treatmentSections;
                    if ($scope.visitSummary) {
                        $scope.ipdDrugOrders = Bahmni.Clinical.VisitDrugOrder.createFromDrugOrders(drugOrderResponse.visitDrugOrders, $scope.visitSummary.startDateTime, getToDate());
                    }
                });
        };
        spinner.forPromise(init());
    };

    return {
        restrict: 'E',
        link: link,
        scope: {
            config: "=",
            visitSummary: '='
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('patientAppointmentsDashboard', ['$http', '$q', '$window','appService', 'virtualConsultService', function ($http, $q, $window, appService, virtualConsultService) {
    var link = function ($scope) {
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/patientAppointmentsDashboard.html";
        var getUpcomingAppointments = function () {
            var params = {
                q: "bahmni.sqlGet.upComingAppointments",
                v: "full",
                patientUuid: $scope.patient.uuid
            };
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/sql', {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };
        var getPastAppointments = function () {
            var params = {
                q: "bahmni.sqlGet.pastAppointments",
                v: "full",
                patientUuid: $scope.patient.uuid
            };
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/sql', {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };
        var convertUTCtoLocal = function (start_date_time, end_date_time) {
            var date = Bahmni.Common.Util.DateUtil.formatDateWithoutTime(start_date_time);
            var timeSlot = Bahmni.Common.Util.DateUtil.formatTime(start_date_time) + " - " + Bahmni.Common.Util.DateUtil.formatTime(end_date_time);
            return [date, timeSlot];
        };
        $q.all([getUpcomingAppointments(), getPastAppointments()]).then(function (response) {
            $scope.upcomingAppointments = response[0].data;
            $scope.upcomingAppointmentsUUIDs = [];
            $scope.teleconsultationAppointments = [];
            $scope.upcomingAppointmentsLinks = [];
            for (var i=0; i<$scope.upcomingAppointments.length; i++) {
                $scope.upcomingAppointmentsUUIDs[i] = $scope.upcomingAppointments[i].uuid;
                $scope.teleconsultationAppointments[i] = 'Virtual' === $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_KIND;
                delete $scope.upcomingAppointments[i].uuid;
                const [date, timeSlot] = convertUTCtoLocal($scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_START_DATE_KEY, $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_END_DATE_KEY);
                delete $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_START_DATE_KEY;
                delete $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_END_DATE_KEY;
                $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_DATE_KEY = date;
                $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_SLOT_KEY = timeSlot;
                $scope.upcomingAppointmentsLinks[i] = $scope.upcomingAppointments[i].tele_health_video_link || "";
                delete $scope.upcomingAppointments[i].DASHBOARD_APPOINTMENTS_KIND;
                delete $scope.upcomingAppointments[i].tele_health_video_link;
            }
            $scope.upcomingAppointmentsHeadings = _.keys($scope.upcomingAppointments[0]);
            $scope.pastAppointments = response[1].data;
            $scope.pastAppointmentsHeadings = _.keys($scope.pastAppointments[0]);
        });

        $scope.goToListView = function () {
            $window.open('/bahmni/appointments/#/home/manage/appointments/list');
        };
        $scope.openJitsiMeet = function (appointmentIndex) {
            var uuid = $scope.upcomingAppointmentsUUIDs[appointmentIndex];
            var link = $scope.upcomingAppointmentsLinks[appointmentIndex];
            virtualConsultService.launchMeeting(uuid, link);
        };
        $scope.showJoinTeleconsultationOption = function (appointmentIndex) {
            return $scope.upcomingAppointments[appointmentIndex].DASHBOARD_APPOINTMENTS_STATUS_KEY == 'Scheduled' &&
                    $scope.teleconsultationAppointments[appointmentIndex];
        }
    };
    return {
        restrict: 'E',
        link: link,
        scope: {
            patient: "=",
            section: "="
        },
        template: '<ng-include src="contentUrl"/>'
    };
}]);
