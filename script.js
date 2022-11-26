'use strict';


// implementing classes to manage the data about Cycling and Running workouts that are comming from the user interface :
class Workout {
    date = new Date();
    // it's not a good practice to have a name (account owner) or something similar as a unique identifier.
    // instead, any object should have some kind of unique identifier so that it can later be identified using that id : 
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;       // [lat, lng]
        this.distance = distance;   // in km
        this.duration = duration;   // in min
    }

    _setDescription() {
        // prettier-ignore 
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
                        'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on 
                            ${months[this.date.getMonth()]} ${this.date.getDay()}`;
    }

    click() {
        this.clicks++;
    }
}   


class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        // this.type = 'running';
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}


class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        // this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}


// Testing out the classes : 
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);


//////////////////////////////////
// APPLICATION ARCHITECTURE 
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    // private class fields - properties of the object : 
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    // both of them will now become private instance properties - properties that are gonna be present on all the instances created through this class 
    #workouts = [];

    constructor() {
        // constructor method is called immediately when a new object is created from this class 
            // and this object that is created (app) is created right at the beginning when the page loads, and so that 
            // means that the constructor is also executed immediately as the page loads : 
        this._getPosition();

        // Attach event handlers : 
            // event listener for the form : 
            form.addEventListener('submit', this._newWorkout.bind(this));
        
            // using an event to hide /display corresponding fields according to the selected element :
            inputType.addEventListener('change', this._toggleElevationField);

            // the situation in which we don't have the element on which we actually want to attach the event listener, because it hasn't been created yet 
            // -> event delegation -> adding the event handler to a parent element : 
            containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        // Get data from local storage : 
        this._getLocalStorage();
    }

    _getPosition() {
        // Using the Geolocation API :  
        // It's called an API because it is, in fact, the browser API (just like e.g. internationalization, timers, or really anything that the browser gives us).
        // But it's also a very modern API. And actually there are many other modern API like that, e.g. to access the users camera or even to make users phone vibrate etc.
        // It takes as an input 2 callback functions - first which will be called on success (whenever the browser successfully got the cordinates of the current position of the user), 
            // and the second callback which is the error callback (the one that's gonna be called when the error happens while getting the cordinates) : 
        if (navigator.geolocation) 
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
            alert('Could not get your position');
        });
    }

    _loadMap(position) {
        // console.log(position);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log(latitude, longitude);
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude];

        // console.log(this);
        // if we managed to successfully get the cordinates : 
                // map object is generated by the Leaflet, and therefore it's going to be a special object with a couple of methods and properties on it 
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(map);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // on() method is not coming from the JS itself - it's instead coming from the Leaflet library
        // map object is generated by the Leaflet, and therefore it's going to be a special object with a couple of methods and properties on it 
        // using on() method as an event listener instead of built-in addEventListener method : 
        this.#map.on('click', this._showForm.bind(this)); 

        // at this point, the #map is already loaded and available :  
        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        // console.log(mapE);

        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // empty the inputs : 
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        // by toggling the same class on both of them, we make sure that it's always one of them that is hidden, and the other one visible : 
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        // helper function to check if all of the arguments are numbers : 
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

        // helper function to check if all of the arguments are positive numbers:
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        // preventing the default behaviour of the forms - reloading the page : 
        e.preventDefault();
        // console.log(this);

        // get data from the form : 
        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        // creating the latitude and longitude properties from the private #mapEvent object : 
        const {lat, lng} = this.#mapEvent.latlng; 
        // workout property that will get an adequate object assigned to it : 
        let workout;

        // if a workout is running, create a running object : 
        if (type === 'running') {
            const cadence = Number(inputCadence.value);
            // check if data is valid : 
            if (
                // !Number.isFinite(distance) || 
                // !Number.isFinite(duration) || 
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
            ) 
                return alert('Inputs have to be positive numbers!');
                
            // creating an adequate object and pushing it into array : 
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // if a workout is cycling, create a cycling object : 
        if (type === 'cycling') {
            const elevation = Number(inputElevation.value);
            // check if data is valid : 
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('Inputs have to be positive numbers!');

            // creating an adequate object and pushing it into array : 
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }


        // add new object to the workout array : 
        this.#workouts.push(workout);
        console.log(workout);


        // render a workout on the map as a marker : 
        this._renderWorkoutMarker(workout);        


        // render the new workout on the list : 
        this._renderWorkout(workout);


        // hide the form + clean the input fields : 
        this._hideForm();
        
        // using the LOCAL STORAGE public interface (API) in order to make workout data persist accross multiple page reloads : 
        // the idea is that whenever a new workout is added, then all the workouts will be added to local storage ; 
            // local storage - basically a place in the browser where we can store the data that will stay there even if we close the page -> 
                // -> basically, the data is linked to the URL on which we are using the application ;
                // -> whenever there is a new workout, we'll take the entire workouts array and store it in the local storage ;
        // whenever the page loads (Page loads event), then all the workouts from the local storage will be loaded and rendered on the map, and also in the list 
            // (just like when user submits the new workout)/ This way, when the page is reloaded, it will gonna appear as if all the previous workouts are still in the same place.
        // -> Set local storage to all workouts 
        // Storing all workouts in the local storage (when user creates a new workout) :
        this._setLocalStorage();
        
    }

    _renderWorkoutMarker(workout) {
        // (displaying a marker on the map for a location we clicked on and submited workout data)
            // console.log(this.#mapEvent);
        // const {lat, lng} = this.#mapEvent.latlng; 
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250, 
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id=${workout.id}>
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
            `;

        if(workout.type === 'running') 
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `
        
        if (workout.type === 'cycling') 
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(2)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `

        // adding a new element (workout represented using html above) as a sibling element at the end of the form : 
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        console.log(workoutEl);

        if(!workoutEl) return;

        // searching for the correct workout from the array : 
        const workout = this.#workouts.find(
            workout => workout.id === workoutEl.dataset.id
        );
        console.log(workout);
        // console.log(this.#workouts);

        // taking the cordinates from the element and moving the map to that position : 
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate : true,
            pan : { duration : 1 }  // animation duration 
        });

        // using the public interface (API) to interact with objects :
        // workout.click();
            // objects that are coming from the local storage will not inherit all the methods that they did before - the firstly formed prototype chain is gone and they will only have the regular Object prototype property 
            // the solution would be to loop over every object from the array (data property in the _getLocalStorage method) and create the new object using the class based on the data that is comming from the local storage 
    }

    // using the LOCAL STORAGE public interface (API) in order to make workout data persist accross multiple page reloads : 
        // the idea is that whenever a new workout is added, then all the workouts will be added to local storage ; 
            // local storage - basically a place in the browser where we can store the data that will stay there even if we close the page -> 
                // -> basically, the data is linked to the URL on which we are using the application ;
                // -> whenever there is a new workout, we'll take the entire workouts array and store it in the local storage ;
        // whenever the page loads (Page loads event), then all the workouts from the local storage will be loaded and rendered on the map, and also in the list 
        // (just like when user submits the new workout)/ This way, when the page is reloaded, it will gonna appear as if all the previous workouts are still in the same place.
    _setLocalStorage() {
        // giving a name to the key (first parameter) and a string (second parameter) that will be stored and associated with the named key (workouts) ;
        // basically, the local storage is a simple 'key : value' store ;
            // since we need to convert a whole object into a string, we'll use JSON.stringify() method :
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }
    // localStorage is a very simple API, and it's only advised to use it for small amounts of data - that's because local storage is blocking (smth that is very bad and will be explained in the next section :) ) 
        // storing very large amounts of data will surely slow the application down  

    _getLocalStorage() {
        // here we are doing the opposite from the _setLocalStorage() method - we are taking the data from the desired key (identifier - first argument) and putting it into the property : 
            // we could set multiple identifiers (keys with values) and basically all of the data from the applicaiton keep into the local storage - we would only need to define one key for each of them and then use that key to retreive the data back 
        // and then we also need to convert the string back to the object - contrary to JSON.stringify() -> JSON.parse() : 
        const data = JSON.parse(localStorage.getItem('workouts'));    // this way we'll get an array with some real objects in there 
        console.log(data);

        if (!data)
            return;

        // restoring the workouts array : 
        this.#workouts = data;
        // this method is going to be executed right at the very beginning (inside of the App constructor), and so at that point the #worokouts array is always going to be empty, but if we already have some data in the local storage then we'll simply set that 
        // #workouts array to the data that we had in the local storage -> esentially, restoring the data across multiple reloads of the page 
        
        // rendering workouts in the list : 
        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
            // #map is not yet created right at the beginning when the application is first loaded - it takes some time - first the position of the user need to be resolved using the geolocation, and then the map also has to be loaded ...
                // there are a lots of stuff that need to happen before we can load the markers on the map - that's why this method cannot go here : 
            // this._renderWorkoutMarker(workout);
            // instead, we should use this method only when the map is loaded (e.g. inside of the method _loadMap())
        })
    }

    // adding method to the public interface - it can be used from the console or outside of the class : 
    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    } 
}

const app = new App();






    
     