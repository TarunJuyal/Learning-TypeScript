//Drag & Drop Interfaces
interface Draggable{
    dragStartHandler(event:DragEvent):void;
    dragEndHandler(event:DragEvent):void;
}

interface DragTarget{
    dragOverHandler(event:DragEvent):void;
    dropHandler(event:DragEvent):void;
    dragLeaveHandler(event:DragEvent):void;
}

//Project Class
enum ProjectStatus {Active,Finished};

class Project{
    constructor(public id:string, public title:string, public description:string, public people:number, public status:ProjectStatus){}
}

type Listener=(items:Project[])=>void;

//Project State Management Class
class ProjectState{
    private listeners:Listener[]=[];
    private projects: Project[]=[];
    private static instance:ProjectState;

    private constructor(){}

    static getInstance(){
        if(this.instance){
            return this.instance;
        }
        this.instance=new ProjectState();
        return this.instance;
    }

    addListener(listenerFn:Listener){
        this.listeners.push(listenerFn);
    }

    addProject(title:string, description:string, people:number){
        const newProject= new Project(Math.random().toString(),title,description,people,ProjectStatus.Active);
        this.projects.push(newProject);
        for(const listenerFn of this.listeners){
            listenerFn(this.projects.slice());
        }
    }

    moveProject(projectId:string,newStatus:ProjectStatus){
        const project=this.projects.find((project)=>project.id===projectId);
        if(project && project.status!==newStatus){
            project.status=newStatus;
        }
        for(const listenerFn of this.listeners){
            listenerFn(this.projects.slice());
        }
    }
}

const projectState =ProjectState.getInstance(); 

//Validation
interface Validatable{
    value : string|number;
    required?:boolean;
    minLength?:number;
    maxLength?:number;
    min?:number;
    max?:number;
}

function validate(validatableInput:Validatable){ 
let isValid=true;
if(validatableInput.required){
    isValid=isValid && validatableInput.value.toString().trim().length!==0;
}
if(validatableInput.minLength!=null && typeof validatableInput.value==='string'){
    isValid=isValid && validatableInput.value.length>=validatableInput.minLength;
}
if(validatableInput.maxLength!=null && typeof validatableInput.value==='string'){
    isValid=isValid && validatableInput.value.length<=validatableInput.maxLength;
}
if(validatableInput.min!=null && typeof validatableInput.value==='number'){
isValid=isValid && validatableInput.value>=validatableInput.min;
}
if(validatableInput.max!=null && typeof validatableInput.value==='number'){
    isValid=isValid && validatableInput.value<=validatableInput.max;
} 
return isValid;
}

//autobind decorator
function autobind(_ : any, _2: string, descriptor: PropertyDescriptor){
const originalMethod=descriptor.value;
const adjustedDescriptor:PropertyDescriptor={
    configurable:true,
    get(){
        const boundFunction=originalMethod.bind(this);
        return boundFunction;
    }
};
return adjustedDescriptor;
}

//Project Item Class
class ProjectItem implements Draggable{
    templateElement:HTMLTemplateElement;
    hostElement:HTMLUListElement;
    liElement:HTMLLIElement;

    get persons(){
        return (this.project.people===1)?'1 person':`${this.project.people} persons`;
    }

    constructor(private project:Project, id:string){
        this.templateElement=document.getElementById('single-project')! as HTMLTemplateElement;
        this.hostElement=document.getElementById(id)! as HTMLUListElement;

        const importNode=document.importNode(this.templateElement.content, true);
        this.liElement=importNode.firstElementChild as HTMLLIElement;
        this.liElement.id=this.project.id;

        this.hostElement.insertAdjacentElement('beforeend',this.liElement);
        this.configure();
        this.renderContent();
    }

    private renderContent(){
        this.liElement.querySelector('h2')!.textContent=this.project.title;
        this.liElement.querySelector('h3')!.textContent=this.persons+' assigned.';
        this.liElement.querySelector('p')!.textContent=this.project.description;
    }

    @autobind
    dragStartHandler(event:DragEvent){
        event.dataTransfer!.setData('text/plain',this.project.id);
        event.dataTransfer!.effectAllowed='move';
    }

    dragEndHandler(_:DragEvent){

    }

    configure(){
        this.liElement.addEventListener('dragstart',this.dragStartHandler);
        this.liElement.addEventListener('dragend',this.dragEndHandler);
    }
}

//Project List Class
class ProjectList implements DragTarget{
    templateElement:HTMLTemplateElement;
    hostElement:HTMLDivElement;
    sectionElement:HTMLElement;
    assignedProjects:Project[];

    constructor(private type: 'active' | 'finished' ){
        this.templateElement=document.getElementById('project-list')! as HTMLTemplateElement;
        this.hostElement=document.getElementById('app')! as HTMLDivElement;
        this.assignedProjects=[];

        //getting the section element
        const importNode=document.importNode(this.templateElement.content, true);
        this.sectionElement=importNode.firstElementChild as HTMLElement;
        this.sectionElement.id=`${this.type}-projects`;

        projectState.addListener((projects:Project[])=>{
            const relevantProjects=projects.filter((project)=>{
                if(this.type==='active'){
                    return project.status===ProjectStatus.Active;
                }
               return project.status===ProjectStatus.Finished;
            });
            this.assignedProjects=relevantProjects;
            this.renderProjects();
        });

        this.hostElement.insertAdjacentElement('beforeend',this.sectionElement);
        this.configure();
        this.renderContent();
    }

    private renderProjects(){
        const listElement=document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        listElement.innerHTML='';
        for(const projectItem of this.assignedProjects){
            new ProjectItem(projectItem,this.sectionElement.querySelector('ul')!.id);
        }
    }

    private renderContent(){
        const listId=`${this.type}-projects-list`;
        this.sectionElement.querySelector('ul')!.id=listId;
        this.sectionElement.querySelector('h2')!.textContent=this.type.toUpperCase()+' PROJECTS';
    }

    @autobind
    dragOverHandler(event:DragEvent){
        if(event.dataTransfer && event.dataTransfer.types[0]==='text/plain'){
            event.preventDefault();
            const listElement=this.sectionElement.querySelector('ul')!;
            listElement.classList.add('droppable');
        }
    }

    @autobind
    dragLeaveHandler(_:DragEvent){
        const listElement=this.sectionElement.querySelector('ul')!;
        listElement.classList.remove('droppable');
    }

    @autobind
    dropHandler(event:DragEvent){
        const projectId=event.dataTransfer!.getData('text/plain');
        projectState.moveProject(projectId, this.type==='active'?ProjectStatus.Active:ProjectStatus.Finished);
    }

    configure(){
        this.sectionElement.addEventListener('dragover',this.dragOverHandler);
        this.sectionElement.addEventListener('dragleave',this.dragLeaveHandler);
        this.sectionElement.addEventListener('drop',this.dropHandler);
    }
}

//Project Input Class
class ProjectInput{
    templateElement:HTMLTemplateElement;
    hostElement:HTMLDivElement;
    formElement:HTMLFormElement;
    titleInputElement:HTMLInputElement;
    descriptionInputElement:HTMLInputElement;
    peopleInputElement:HTMLInputElement;

    constructor(){
        this.templateElement=document.getElementById('project-input')! as HTMLTemplateElement;
        this.hostElement=document.getElementById('app')! as HTMLDivElement;

        //getting the form element
        const importNode=document.importNode(this.templateElement.content, true);
        this.formElement=importNode.firstElementChild as HTMLFormElement;
        this.formElement.id='user-input';

        this.titleInputElement=this.formElement.querySelector("#title") as HTMLInputElement;
        this.descriptionInputElement=this.formElement.querySelector("#description") as HTMLInputElement;
        this.peopleInputElement=this.formElement.querySelector("#people") as HTMLInputElement;

        this.formElement.addEventListener('submit',this.submitHandler);

        //attaching form element to main div element
        this.hostElement.insertAdjacentElement('afterbegin',this.formElement);
    }

    private gatherUserInput():[string,string,number] | void{
        const enteredTitle=this.titleInputElement.value;
        const enteredDescription=this.descriptionInputElement.value;
        const enteredPeople=this.peopleInputElement.value;

        const titleValidatable:Validatable={
            value:enteredTitle,
            required:true,
            minLength:5
        };
        const descriptionValidatable:Validatable={
            value:enteredDescription,
            required:true,
            minLength:10
        };
        const peopleValidatable:Validatable={
            value: +enteredPeople,
            required:true,
            min:1,
            max:10
        };

        if(!validate(titleValidatable) || !validate(descriptionValidatable) || !validate(peopleValidatable)){
            alert("Invalid Input, Please Try Again!!!");
            return;
        }else{
            return [enteredTitle,enteredDescription, +enteredPeople];
        }
    }

    private clearInputs(){
        this.titleInputElement.value='';
        this.descriptionInputElement.value='';
        this.peopleInputElement.value='';
    }

    @autobind
    private submitHandler(event : Event){
        event.preventDefault();
        const userInput=this.gatherUserInput();
        if(Array.isArray(userInput)){
            const [title,description,people]=userInput;
            projectState.addProject(title,description,people);
            this.clearInputs()
        }
    }

}

const projectInput=new ProjectInput();
const activeProjectList= new ProjectList('active');
const finishedProjectList= new ProjectList('finished');