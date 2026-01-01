/**
 * Example of dispatching custom events for Abrantes A/B testing framework
 * to demonstrate the events that can be listened to.
 * 
 * Note: This is just an example and does not perform any actual A/B testing.
 */


// Variant assigned to the user
document.dispatchEvent(new CustomEvent("abrantes:assignVariant", {
    detail: {
        testId: "exampleExperiment",
        variant: 1
    }
}));

// Variant rendered to the user
document.dispatchEvent(new CustomEvent("abrantes:renderVariant", {
    detail: {
        testId: "exampleExperiment",
        variant: 1
    }
}));

// Variant persisted for the user as a cookie or in localStorage/sessionStorage
document.dispatchEvent(new CustomEvent("abrantes:persist", {
    detail: {
        testId: "exampleExperiment",
        variant: 1,
        context: "sessionStorage"
    }
}));

// Tracking event sent to analytics tool
document.dispatchEvent(new CustomEvent("abrantes:track", {
    detail: {
        testId: "exampleExperiment",
        variant: 1,
        customDim: "my_custom_dimension",
        tool: "myAnalyticsTool",
        type: "event"
    }
}));

// Form field populated with test and variant info
document.dispatchEvent(new CustomEvent("abrantes:formTrack", {
    detail: {
        testId: "exampleExperiment",
        variant: 1,
        element: "#input_for_id_and_variant"
    }
}));