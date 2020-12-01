
function subjectName(subject){
    subject = subject.split('.');
    var name;
    switch(subject[0].toUpperCase()){
        case 'M':
            name = 'математика';
            break;
        case 'М':
            name = 'математика';
            break;
        case 'GM':
            name = 'геометрия';
            break;
        case 'A':
            name = 'алгебра';
            break;
        case 'MG':
            name = 'мат. грамотность';
            break;
        case 'K':
            name = 'казахский язык';
            break;
        case 'R':
            name = 'русский язык';
            break;
        case 'E':
            name = 'английский язык';
            break;
        case 'L':
            name = 'логика';
            break;
        case 'F':
            name = 'физика';
            break;
        case 'CH':
            name = 'химия';
            break;
        case 'X':
            name = 'химия';
            break;
        case 'B':
            name = 'биология';
            break;
        case 'HK':
            name = 'история Казахстана';
            break;
        case 'OB':
            name = 'обучение грамоте';
            break;
        case 'KL':
            name = 'каллиграфия';
            break;
        case 'G':
            name = 'география';
            break;
        case 'SA':
            name = 'обучение грамотности';
            break;
        case 'WH':
            name = 'всемирная История';
            break;
        case 'OG':
            name = 'обучению грамоте';
			break;
		case 'GR':
			name = 'грамотность чтения';
			break;
        case 'RR':
            name = 'развития речи';
            break;
        case 'D':
            name = 'познания мира';
            break;
        case 'RD':
            name = 'чтения';
            break;
        case 'T':
            name = 'творчество';
            break;
        case 'P':
            name = 'письмо';
            break;
        case 'CHOP':
            name = 'человек Общество Право';
            break;
        case 'IND':
            switch(subject[1].toUpperCase()){
            case 'M':
                name = 'математика';
                break;
            case 'GM':
                name = 'геометрия';
                break;
            case 'A':
                name = 'алгебра';
                break;
            case 'MG':
                name = 'мат. грамотность';
                break;
            case 'K':
                name = 'казахский язык';
                break;
            case 'R':
                name = 'русский язык';
                break;
            case 'E':
                name = 'английский язык';
                break;
            case 'L':
                name = 'логика';
                break;
            case 'F':
                name = 'физика';
                break;
            case 'CH':
                name = 'химия';
                break;
            case 'X':
                name = 'химия';
                break;
            case 'B':
                name = 'биология';
                break;
            case 'HK':
                name = 'история Казахстана';
                break;
            case 'OB':
                name = 'обучение грамоте';
                break;
            case 'KL':
                name = 'каллиграфия';
                break;
            case 'G':
                name = 'география';
                break;
            case 'SA':
                name = 'сауат Ашу';
                break;
            case 'WH':
                name = 'всемирная История';
                break;
            case 'OG':
                name = 'обучению грамоте';
                break;
            case 'RR':
                name = 'развития речи';
                break;
            case 'D':
                name = 'познания мира';
                break;
            case 'RD':
                name = 'чтения';
                break;
            case 'T':
                name = 'творчество';
                break;
            case 'P':
                name = 'письмо';
				break;
			case 'GR':
				name = 'грамотность чтения';
				break;
            case 'CHOP':
                name = 'человек Общество Право';
                break;
            }
            break;
        default:
            name = 'индивидуальный урок';
            break;
    }

    return name;
}

function getBranch(subject){
	if(subject.includes('RO'))
		return 'РО';
	else
		return 'КО';
}

function getClass(subject){
	var gr = subject.split('.');
	var klass = gr[0] == 'IND' ? gr[2]:gr[1] == 'N'?gr[2]:gr[1];
	return klass;
}

function getSubject(subject){
	var gr = subject.split('.');
	var subject = gr[0] == 'IND' ? gr[1]:gr[0];

	return subject;
}

module.exports = {
	subjectName,
	getBranch,
	getClass,
	getSubject
}